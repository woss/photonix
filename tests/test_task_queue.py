import threading
import time
from pathlib import Path

from django.utils import timezone
import pytest

from .factories import LibraryFactory
from photonix.photos.models import Task
from photonix.photos.utils.classification import process_classify_images_tasks
from photonix.photos.utils.raw import ensure_raw_processing_tasks
from photonix.photos.utils.thumbnails import process_generate_thumbnails_tasks

# pytestmark = pytest.mark.django_db


@pytest.fixture
def photo_fixture_snow(db):
    from photonix.photos.utils.db import record_photo
    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory()
    return record_photo(snow_path, library)


def test_tasks_created_updated(photo_fixture_snow):
    # Task should have been created for the fixture
    task = Task.objects.get(type='ensure_raw_processed', status='P', subject_id=photo_fixture_snow.id)
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None

    # Test manually starting makes intended changes
    task.start()
    assert task.status == 'S'
    assert (timezone.now() - task.started_at).seconds < 1

    # Undo last changes
    task.status = 'P'
    task.started_at = None
    task.save()

    # Calling this function should complete the task and queue up a new one for generating thumbnails
    ensure_raw_processing_tasks()
    task = Task.objects.get(type='ensure_raw_processed', subject_id=photo_fixture_snow.id)
    assert task.status == 'C'
    assert (timezone.now() - task.started_at).seconds < 1
    assert (timezone.now() - task.finished_at).seconds < 1

    # Check next task has been created
    task = Task.objects.get(type='generate_thumbnails', subject_id=photo_fixture_snow.id)
    assert task.status == 'P'
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None

    # Process tasks to generate thumbnails which should add new task for classification
    process_generate_thumbnails_tasks()
    task = Task.objects.get(type='generate_thumbnails', subject_id=photo_fixture_snow.id)
    assert task.status == 'C'
    assert (timezone.now() - task.started_at).seconds < 10
    assert (timezone.now() - task.finished_at).seconds < 1

    # Chekc next task has been added to classify images
    task = Task.objects.get(type='classify_images', subject_id=photo_fixture_snow.id)
    assert task.status == 'P'
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None

    # Processing the classification task should create child processes
    assert task.complete_with_children == False
    assert task.status == 'P'
    process_classify_images_tasks()
    task = Task.objects.get(type='classify_images', subject_id=photo_fixture_snow.id)
    assert task.status == 'S'
    assert task.children.count() == 6
    assert task.complete_with_children == True

    # Completing all the child processes should set the parent task to completed
    for child in task.children.all():
        assert child.status == 'P'
        child.start()
        assert task.status == 'S'
        assert child.status == 'S'
        child.complete()
        assert child.status == 'C'
    task.refresh_from_db()
    assert task.status == 'C'


def test_task_claim_is_atomic(photo_fixture_snow):
    from photonix.photos.utils.raw import ensure_raw_processed

    # Two processor replicas fetch the same Pending task - only one may win
    task_a = Task.objects.get(type='ensure_raw_processed', subject_id=photo_fixture_snow.id)
    task_b = Task.objects.get(pk=task_a.pk)

    assert task_a.claim() is True
    assert task_a.status == 'S'
    assert task_a.started_at is not None
    assert task_b.claim() is False

    # The losing replica must skip the task rather than process it again
    ensure_raw_processed(task_b.subject_id, task_b)
    assert not Task.objects.filter(type='generate_thumbnails', subject_id=photo_fixture_snow.id).exists()


def test_no_classifier_tasks_created_for_disabled_classifiers(db):
    # Tasks for disabled classifiers would never be picked up by their
    # processor, leaving the parent classify_images task incomplete forever
    from photonix.photos.utils.db import record_photo

    snow_path = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    library = LibraryFactory(
        classification_color_enabled=False,
        classification_location_enabled=False,
        classification_style_enabled=False,
        classification_object_enabled=False,
        classification_face_enabled=False,
    )
    photo = record_photo(snow_path, library)
    task = Task.objects.create(type='classify_images', subject_id=photo.id, library=library)

    process_classify_images_tasks()
    task.refresh_from_db()

    # Only the event classifier (which has no library toggle) gets a task
    child_types = set(task.children.values_list('type', flat=True))
    assert child_types == {'classify.event'}

    # Completing it must complete the parent - before the fix five orphaned
    # child tasks would have blocked it in Started status permanently
    for child in task.children.all():
        child.claim()
        child.complete()
    task.refresh_from_db()
    assert task.status == 'C'


def test_scheduler_processes_tasks_in_steady_state(db, monkeypatch):
    # The scheduler must attempt processing on every poll - gating it on the
    # remaining count changing meant pending tasks were never expanded once
    # the count settled (steady state)
    import uuid

    from photonix.photos.management.commands import classification_scheduler

    library = LibraryFactory()
    Task.objects.create(type='classify_images', subject_id=uuid.uuid4(), library=library)

    process_calls = []
    monkeypatch.setattr(classification_scheduler, 'process_classify_images_tasks',
                        lambda: process_calls.append(1))

    def fake_sleep(seconds):
        if len(process_calls) >= 3 or fake_sleep.iterations >= 5:
            raise KeyboardInterrupt
        fake_sleep.iterations += 1
    fake_sleep.iterations = 0
    monkeypatch.setattr(classification_scheduler, 'sleep', fake_sleep)

    with pytest.raises(KeyboardInterrupt):
        classification_scheduler.Command().run_scheduler()

    # The pending count never changes across iterations so the old code
    # would only have processed once
    assert len(process_calls) >= 3


def test_sibling_completion_creates_single_downstream_chain(db):
    # A stale duplicate completion (e.g. two replicas racing) must not
    # re-complete tasks or create a second downstream task chain
    import uuid

    library = LibraryFactory()
    subject_id = uuid.uuid4()
    parent = Task.objects.create(type='parent_task', subject_id=subject_id, complete_with_children=True, library=library)
    child_a = Task.objects.create(type='child_task', subject_id=subject_id, parent=parent, library=library)
    child_b = Task.objects.create(type='child_task', subject_id=subject_id, parent=parent, library=library)

    # Copy of child_b as a concurrent process would have fetched it
    stale_b = Task.objects.get(pk=child_b.pk)

    child_a.complete(next_type='downstream_task', next_subject_id=subject_id)
    parent.refresh_from_db()
    assert parent.status == 'P'

    child_b.complete(next_type='downstream_task', next_subject_id=subject_id)
    parent.refresh_from_db()
    assert parent.status == 'C'
    assert Task.objects.filter(type='downstream_task').count() == 1

    # Replaying the completion from the stale copy must be a no-op
    stale_b.complete(next_type='downstream_task', next_subject_id=subject_id)
    assert Task.objects.filter(type='downstream_task').count() == 1


def test_processor_worker_survives_bad_task(monkeypatch):
    # A task that raises during processing must not kill the worker thread and
    # must still call q.task_done() so the dispatch loop's q.join() can return
    from photonix.photos.management.commands import raw_processor, thumbnail_processor

    class StubTask:
        subject_id = 'poisoned'
        id = 'stub-task-id'

        def __init__(self):
            self.marked_failed = False

        def failed(self):
            self.marked_failed = True

    def raise_error(subject_id, task):
        raise ValueError('simulated corrupt file')

    for module, processing_func in [
        (thumbnail_processor, 'generate_thumbnails_for_photo'),
        (raw_processor, 'process_raw_task'),
    ]:
        monkeypatch.setattr(module, processing_func, raise_error)
        task = StubTask()
        thread = threading.Thread(target=module.worker, daemon=True)
        thread.start()
        module.q.put(task)

        # Equivalent to q.join() but fails rather than deadlocks on regression
        deadline = time.time() + 10
        while module.q.unfinished_tasks and time.time() < deadline:
            time.sleep(0.05)
        assert module.q.unfinished_tasks == 0

        assert task.marked_failed
        module.q.put(None)  # Shut worker down cleanly
        thread.join(timeout=5)
        assert not thread.is_alive()
