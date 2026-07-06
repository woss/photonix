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
    assert task.status == 'C'


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
