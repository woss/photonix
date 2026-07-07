import os
import struct
from pathlib import Path

from django.conf import settings
from django.utils import timezone
import pytest

from .factories import LibraryFactory
from photonix.photos.models import PhotoFile, Task
from photonix.photos.utils.fs import download_file
from photonix.photos.utils.raw import generate_jpeg, ensure_raw_processing_tasks, identified_as_jpeg, process_raw_tasks
from photonix.photos.utils.thumbnails import process_generate_thumbnails_tasks


PHOTOS = [
    # -e argument to dcraw means JPEG was extracted without any processing
    ('Adobe DNG Converter - Canon EOS 5D Mark III - Lossy JPEG compression (3_2).DNG',  'dcraw -e', 1236950, ['https://epixstudios.co.uk/uploads/filer_public/36/fa/36fad1f0-8032-45da-bad8-7d9b7d490d99/adobe_dng_converter_-_canon_eos_5d_mark_iii_-_lossy_jpeg_compression_3_2.dng', 'https://raw.pixls.us/getfile.php/1023/nice/Adobe%20DNG%20Converter%20-%20Canon%20EOS%205D%20Mark%20III%20-%20Lossy%20JPEG%20compression%20(3:2).DNG']),
    ('Apple - iPhone 8 - 16bit (4_3).dng',                                              'dcraw -w', 772618, ['https://epixstudios.co.uk/uploads/filer_public/5f/f3/5ff34f05-2c6a-4b5d-a1c5-b0d73f9273d9/apple_-_iphone_8_-_16bit_4_3.dng', 'https://raw.pixls.us/getfile.php/2835/nice/Apple%20-%20iPhone%208%20-%2016bit%20(4:3).dng']),  # No embedded JPEG
    ('Canon - Canon PowerShot SX20 IS.DNG',                                             'dcraw -w', 1828344, ['https://epixstudios.co.uk/uploads/filer_public/4e/28/4e28cab6-0523-48e3-a70b-e5bdaf041bb1/canon_-_canon_powershot_sx20_is.dng', 'https://raw.pixls.us/getfile.php/861/nice/Canon%20-%20Canon%20PowerShot%20SX20%20IS.DNG']),  # Embedded image but low resolution and not a JPEG
    ('Canon - EOS 7D - sRAW2 (sRAW) (3:2).CR2',                                         'dcraw -e', 2264602, ['https://epixstudios.co.uk/uploads/filer_public/7f/a2/7fa2e9d6-a1fc-4ca6-bb19-306c1320c9c4/canon_-_eos_7d_-_sraw2_sraw_32.cr2', 'https://raw.pixls.us/getfile.php/129/nice/Canon%20-%20EOS%207D%20-%20sRAW2%20(sRAW)%20(3:2).CR2']),
    ('Canon - Powershot SX110IS - CHDK.CR2',                                            'dcraw -w', 1493825, ['https://epixstudios.co.uk/uploads/filer_public/ab/6b/ab6b7ff2-f892-4698-add4-3c304142cfa6/canon_-_powershot_sx110is_-_chdk.cr2', 'https://raw.pixls.us/getfile.php/144/nice/Canon%20-%20Powershot%20SX110IS%20-%20CHDK.CR2']),  # No embedded JPEG, No metadata about image dimensions for us to compare against
    ('Leica - D-LUX 5 - 16_9.RWL',                                                      'dcraw -w', 1478207, ['https://epixstudios.co.uk/uploads/filer_public/a5/0f/a50f6ddb-ab72-4e78-8e68-f6131e3a7dcd/leica_-_d-lux_5_-_16_9.rwl', 'https://raw.pixls.us/getfile.php/2808/nice/Leica%20-%20D-LUX%205%20-%2016:9.RWL']),  # Less common aspect ratio, fairly large embedded JPEG but not similar enough to the raw's dimensions
    ('Nikon - 1 J1 - 12bit compressed (Lossy (type 2)) (3_2).NEF',                      'dcraw -e', 635217, ['https://epixstudios.co.uk/uploads/filer_public/a6/7c/a67c538f-254d-4793-862c-4b3dc3bda0ef/nikon_-_1_j1_-_12bit_compressed_lossy_type_2_3_2.nef', 'https://raw.pixls.us/getfile.php/2956/nice/Nikon%20-%201%20J1%20-%2012bit%20compressed%20(Lossy%20(type%202))%20(3:2).NEF']),
    ('Sony - SLT-A77 - 12bit compressed (3_2).ARW',                                     'dcraw -w', 859814, ['https://epixstudios.co.uk/uploads/filer_public/42/a6/42a6b056-7e33-4100-b652-5b96aff8bc22/sony_-_slt-a77_-_12bit_compressed_3_2.arw', 'https://raw.pixls.us/getfile.php/2691/nice/Sony%20-%20SLT-A77%20-%2012bit%20compressed%20(3:2).ARW']),  # Large embedded JPEG but not the right aspect ratio and smaller than raw
]


def test_get_exiftool_image_returns_output_files(tmpdir):
    # Used by CR3 processing - a bug where dict entries were annotated
    # instead of assigned made this always return an empty dict, breaking
    # Canon CR3 imports entirely
    from photonix.photos.utils import raw

    basename = 'IMG_0001.CR3'
    for fn in [basename, 'IMG_0001.jpg', 'IMG_0001.jpg_original']:
        (Path(tmpdir) / fn).touch()

    result = raw.__get_exiftool_image(str(tmpdir), basename)
    assert result['output'] == Path(tmpdir) / 'IMG_0001.jpg'
    assert result['original'] == Path(tmpdir) / 'IMG_0001.jpg_original'


def build_synthetic_dng(path, width=512, height=512):
    """Write a minimal but valid Bayer CFA DNG that dcraw can process.

    Generated at test time so no large raw file has to live in the repo or
    be downloaded - real camera raws stay in the network-marked tests below.
    """
    TYPE_BYTE, TYPE_ASCII, TYPE_SHORT, TYPE_LONG, TYPE_SRATIONAL = 1, 2, 3, 4, 10

    strip = b''.join(
        struct.pack('<H', ((x * 127) + (y * 31)) % 65536)
        for y in range(height) for x in range(width))

    make = b'PhotonixTest\x00'
    model = b'Synthetic DNG\x00'
    unique_camera_model = b'PhotonixTest Synthetic DNG\x00'
    modify_date = b'2019:06:15 12:00:00\x00'
    identity_matrix = b''.join(struct.pack('<ll', v, 10000)
                               for v in [10000, 0, 0, 0, 10000, 0, 0, 0, 10000])

    tags = [  # (tag id, type, count, packed value)
        (254, TYPE_LONG, 1, struct.pack('<L', 0)),           # NewSubfileType
        (256, TYPE_LONG, 1, struct.pack('<L', width)),
        (257, TYPE_LONG, 1, struct.pack('<L', height)),
        (258, TYPE_SHORT, 1, struct.pack('<H', 16)),         # BitsPerSample
        (259, TYPE_SHORT, 1, struct.pack('<H', 1)),          # Uncompressed
        (262, TYPE_SHORT, 1, struct.pack('<H', 32803)),      # Photometric: CFA
        (271, TYPE_ASCII, len(make), make),
        (272, TYPE_ASCII, len(model), model),
        (273, TYPE_LONG, 1, None),                           # StripOffsets (fixed up below)
        (277, TYPE_SHORT, 1, struct.pack('<H', 1)),          # SamplesPerPixel
        (278, TYPE_LONG, 1, struct.pack('<L', height)),      # RowsPerStrip
        (279, TYPE_LONG, 1, struct.pack('<L', len(strip))),  # StripByteCounts
        (284, TYPE_SHORT, 1, struct.pack('<H', 1)),          # PlanarConfiguration
        (306, TYPE_ASCII, len(modify_date), modify_date),
        (33421, TYPE_SHORT, 2, struct.pack('<HH', 2, 2)),    # CFARepeatPatternDim
        (33422, TYPE_BYTE, 4, bytes([0, 1, 1, 2])),          # CFAPattern: RGGB
        (50706, TYPE_BYTE, 4, bytes([1, 4, 0, 0])),          # DNGVersion
        (50707, TYPE_BYTE, 4, bytes([1, 1, 0, 0])),          # DNGBackwardVersion
        (50708, TYPE_ASCII, len(unique_camera_model), unique_camera_model),
        (50717, TYPE_LONG, 1, struct.pack('<L', 65535)),     # WhiteLevel
        (50721, TYPE_SRATIONAL, 9, identity_matrix),         # ColorMatrix1
        (50778, TYPE_SHORT, 1, struct.pack('<H', 21)),       # CalibrationIlluminant1: D65
    ]

    # Values wider than 4 bytes live after the IFD and are pointed at by offset
    data_start = 8 + 2 + len(tags) * 12 + 4
    out_of_line = {}
    cursor = data_start
    for tag, _, _, packed in tags:
        if packed is not None and len(packed) > 4:
            out_of_line[tag] = cursor
            cursor += len(packed) + (len(packed) % 2)
    strip_offset = cursor

    buf = bytearray()
    buf += b'II*\x00' + struct.pack('<L', 8)
    buf += struct.pack('<H', len(tags))
    for tag, typ, count, packed in tags:
        if tag == 273:
            packed = struct.pack('<L', strip_offset)
        buf += struct.pack('<HHL', tag, typ, count)
        buf += struct.pack('<L', out_of_line[tag]) if tag in out_of_line else packed.ljust(4, b'\x00')
    buf += struct.pack('<L', 0)  # No next IFD
    for tag, _, _, packed in tags:
        if tag in out_of_line:
            buf += packed + b'\x00' * (len(packed) % 2)
    buf += strip
    with open(path, 'wb') as f:
        f.write(bytes(buf))


@pytest.mark.django_db
def test_raw_task_pipeline_with_synthetic_dng(tmpdir):
    # Covers the raw processing task chain without needing to download real
    # camera files (those are exercised by the network-marked tests)
    from photonix.photos.utils.db import record_photo

    raw_path = str(Path(tmpdir) / 'synthetic.dng')
    build_synthetic_dng(raw_path)

    library = LibraryFactory()
    photo = record_photo(raw_path, library)
    photo_file = photo.files.get()
    assert photo_file.mimetype == 'image/x-adobe-dng'

    ensure_raw_processing_tasks()
    parent_task = Task.objects.get(type='ensure_raw_processed', subject_id=photo.id)
    child_task = Task.objects.get(type='process_raw', parent=parent_task)
    assert parent_task.status == 'S'
    assert child_task.status == 'P'
    assert child_task.subject_id == photo_file.id

    process_raw_tasks()
    parent_task.refresh_from_db()
    child_task.refresh_from_db()
    assert parent_task.status == 'C'
    assert child_task.status == 'C'

    photo_file.refresh_from_db()
    assert photo_file.raw_processed is True
    assert photo_file.raw_external_params == 'dcraw -w'
    output_path = Path(settings.PHOTO_RAW_PROCESSED_DIR) / '{}.jpg'.format(photo_file.id)
    assert os.path.exists(output_path)
    assert identified_as_jpeg(output_path) is True
    assert Task.objects.filter(type='generate_thumbnails', subject_id=photo.id).count() == 1

    os.remove(output_path)


@pytest.mark.network
def test_extract_jpg():
    for fn, intended_process_params, intended_filesize, urls in PHOTOS:
        raw_photo_path = str(Path(__file__).parent / 'photos' / fn)
        if not os.path.exists(raw_photo_path):
            for url in urls:
                try:
                    download_file(url, raw_photo_path)
                    if not os.path.exists(raw_photo_path) or os.stat(raw_photo_path).st_size < 1024 * 1024:
                        try:
                            os.remove(raw_photo_path)
                        except:
                            pass
                    else:
                        break
                except:
                    pass

        if not os.path.exists(raw_photo_path):
            pytest.skip(f'Could not download raw photo: {fn}')

        output_path, _, process_params, _ = generate_jpeg(raw_photo_path)

        assert process_params == intended_process_params
        assert identified_as_jpeg(output_path) == True
        filesizes = [intended_filesize, os.stat(output_path).st_size]
        assert min(filesizes) / max(filesizes) > 0.8  # Within 20% of the intended JPEG filesize

        os.remove(output_path)


@pytest.fixture
def photo_fixture_raw(db):
    from photonix.photos.utils.db import record_photo
    photo_index = 4  # Photo selected because it doesn't have width and height metadata
    raw_photo_path = str(Path(__file__).parent / 'photos' / PHOTOS[photo_index][0])

    if not os.path.exists(raw_photo_path):
        urls = PHOTOS[photo_index][3]
        for url in urls:
            try:
                download_file(url, raw_photo_path)
                break
            except:
                pass

    if not os.path.exists(raw_photo_path):
        pytest.skip(f'Could not download raw photo: {PHOTOS[photo_index][0]}')

    library = LibraryFactory()
    return record_photo(raw_photo_path, library)


@pytest.mark.network
def test_task_raw_processing(photo_fixture_raw):
    # Task should have been created for the fixture
    task = Task.objects.get(type='ensure_raw_processed', status='P', subject_id=photo_fixture_raw.id)
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None
    assert task.status == 'P'
    assert task.complete_with_children == True

    # Calling this function should create a child task tp generate a JPEG from the raw file
    ensure_raw_processing_tasks()
    parent_task = Task.objects.get(type='ensure_raw_processed', subject_id=photo_fixture_raw.id)
    child_task = Task.objects.get(type='process_raw', parent=parent_task)
    assert parent_task.status == 'S'
    assert child_task.status == 'P'

    # PhotoFile should have been created widthout dimensions as metadata for this photo doesn't include it
    photo_file = PhotoFile.objects.get(id=child_task.subject_id)
    assert photo_file.width is None

    # Call the processing function
    process_raw_tasks()

    # Tasks should be now marked as completed
    parent_task = Task.objects.get(type='ensure_raw_processed', subject_id=photo_fixture_raw.id)
    child_task = Task.objects.get(type='process_raw', parent=parent_task)
    assert parent_task.status == 'C'
    assert child_task.status == 'C'

    # PhotoFile object should have been updated to show raw file has been processed
    photo_file = PhotoFile.objects.get(id=child_task.subject_id)
    assert photo_file.raw_processed == True
    assert photo_file.raw_version == 20190305
    assert photo_file.raw_external_params == 'dcraw -w'
    assert '9.' in photo_file.raw_external_version
    output_path = Path(settings.PHOTO_RAW_PROCESSED_DIR) / '{}.jpg'.format(photo_file.id)
    assert os.path.exists(output_path)
    assert os.path.exists(output_path) == os.path.exists(photo_fixture_raw.base_image_path)
    assert os.stat(output_path).st_size > 1024 * 1024  # JPEG greater than 1MB in size
    assert photo_file.width == 3684  # Width should now be set

    # Thumbnailing task should have been created as ensure_raw_processed and process_raw have completed
    assert Task.objects.filter(type='generate_thumbnails', subject_id=photo_fixture_raw.id).count() == 1
    task = Task.objects.get(type='generate_thumbnails', subject_id=photo_fixture_raw.id)
    assert (timezone.now() - task.created_at).seconds < 1
    assert (timezone.now() - task.updated_at).seconds < 1
    assert task.started_at == None
    assert task.finished_at == None

    # Process tasks to generate thumbnails which should add new task for classification
    process_generate_thumbnails_tasks()
    task = Task.objects.get(type='generate_thumbnails', subject_id=photo_fixture_raw.id)
    assert task.status == 'C'
    assert (timezone.now() - task.started_at).seconds < 10
    assert (timezone.now() - task.finished_at).seconds < 1

    # Make sure thumbnails got generated
    for thumbnail in settings.THUMBNAIL_SIZES:
        if thumbnail[4]:
            path = photo_fixture_raw.thumbnail_path(thumbnail)
            assert os.path.exists(path)
    thumbnail_path = photo_fixture_raw.thumbnail_path((256, 256, 'cover', 50))
    assert os.stat(thumbnail_path).st_size > 9463 * 0.8
    assert os.stat(thumbnail_path).st_size < 9463 * 1.2

    # Tidy up filesystem
    os.remove(output_path)
    for thumbnail in settings.THUMBNAIL_SIZES:
        if thumbnail[4]:
            path = photo_fixture_raw.thumbnail_path(thumbnail)
            os.remove(path)
