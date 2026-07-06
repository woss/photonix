import shutil
import subprocess
from pathlib import Path

import pytest

from .factories import LibraryFactory


PHOTOS_DIR = Path(__file__).parent / 'photos'


def test_determine_same_file_compares_image_data(tmp_path):
    # Same image pixels but different file bytes (metadata edited) must be
    # recognised as the same photo via the PIL comparison path
    from photonix.photos.utils.organise import determine_same_file

    path_a = tmp_path / 'a.jpg'
    path_b = tmp_path / 'b.jpg'
    shutil.copy2(PHOTOS_DIR / 'snow.jpg', path_a)
    shutil.copy2(PHOTOS_DIR / 'snow.jpg', path_b)
    subprocess.run(['exiftool', '-Artist=Somebody Else', '-overwrite_original', str(path_b)], check=True)

    assert determine_same_file(str(path_a), str(path_b)) is True
    assert determine_same_file(str(path_a), str(PHOTOS_DIR / 'tree.jpg')) is False


@pytest.mark.django_db
def test_import_photos_from_dir(tmp_path, settings):
    from photonix.photos.models import PhotoFile
    from photonix.photos.utils.organise import import_photos_from_dir

    src = tmp_path / 'src'
    dest = tmp_path / 'dest'
    src.mkdir()
    dest.mkdir()
    shutil.copy2(PHOTOS_DIR / 'snow.jpg', src / 'snow.jpg')
    settings.PHOTO_OUTPUT_DIRS = [{'EXTENSIONS': ['jpg', 'jpeg'], 'PATH': str(dest)}]
    library = LibraryFactory()

    import_photos_from_dir(str(src), library)

    photo_files = PhotoFile.objects.filter(photo__library=library)
    assert photo_files.count() == 1
    assert photo_files[0].path.startswith(str(dest))
    assert Path(photo_files[0].path).exists()
    # Source file must still be there because we didn't pass move=True
    assert (src / 'snow.jpg').exists()


@pytest.mark.django_db
def test_import_photos_from_dir_name_collision(tmp_path, settings):
    # A different photo already at the destination path must be imported
    # under a new name rather than aborting the whole run
    from photonix.photos.models import PhotoFile
    from photonix.photos.utils.organise import import_photos_from_dir

    src = tmp_path / 'src'
    dest = tmp_path / 'dest'
    src.mkdir()
    shutil.copy2(PHOTOS_DIR / 'snow.jpg', src / 'snow.jpg')
    # snow.jpg was taken on 2018-02-28 so that's where it would be filed
    colliding_dir = dest / '2018' / '02' / '28'
    colliding_dir.mkdir(parents=True)
    shutil.copy2(PHOTOS_DIR / 'tree.jpg', colliding_dir / 'snow.jpg')
    settings.PHOTO_OUTPUT_DIRS = [{'EXTENSIONS': ['jpg', 'jpeg'], 'PATH': str(dest)}]
    library = LibraryFactory()

    import_photos_from_dir(str(src), library)

    assert (colliding_dir / 'snow_1.jpg').exists()
    assert PhotoFile.objects.filter(photo__library=library, path=str(colliding_dir / 'snow_1.jpg')).count() == 1
