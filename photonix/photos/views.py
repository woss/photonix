import os
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseRedirect, FileResponse
from django.shortcuts import get_object_or_404

from photonix.photos.utils.thumbnails import get_thumbnail
from photonix.photos.models import Photo


def thumbnailer(request, type, id, width, height, crop, quality):
    width = int(width)
    height = int(height)
    quality = int(quality)

    thumbnail_size_index = None
    force_accurate = False
    for i, thumbnail_size in enumerate(settings.THUMBNAIL_SIZES):
        if width == thumbnail_size[0] and height == thumbnail_size[1] and crop == thumbnail_size[2] and quality == thumbnail_size[3]:
            thumbnail_size_index = i
            force_accurate = thumbnail_size[5]
            break

    if thumbnail_size_index is None:
        return HttpResponseNotFound('No photo thumbnail with these parameters')

    photo_id = None
    photo_file_id = None
    if type == 'photo':
        photo_id = id
    elif type == 'photofile':
        photo_file_id = id

    path = get_thumbnail(photo_file=photo_file_id, photo=photo_id, width=width, height=height, crop=crop, quality=quality, return_type='url', force_accurate=force_accurate)
    response = HttpResponseRedirect(path)
    # Cache the redirect for 7 days - thumbnail URLs are immutable (based on photo ID)
    response['Cache-Control'] = 'public, max-age=604800, immutable'
    return response


def photo_download(request, photo_id):
    # Originals are served via this unguessable (uuid4) per-photo URL rather than
    # their real, enumerable filename. Nginx serves the file directly through an
    # internal X-Accel-Redirect so large originals don't stream through the app.
    photo = get_object_or_404(Photo, id=photo_id)
    base_file = photo.base_file
    if not base_file or not str(base_file.path).startswith('/data'):
        return HttpResponseNotFound('Photo not available for download')
    real_path = str(base_file.path)
    filename = os.path.basename(real_path)

    if os.environ.get('ENV') == 'test':
        # No Nginx in the test harness, so stream the file directly.
        return FileResponse(open(real_path, 'rb'), as_attachment=True, filename=filename)

    # The internal /photos Nginx location maps the /data-relative path to disk.
    internal_url = quote(real_path.split('/data', 1)[1])
    response = HttpResponse(content_type='')
    response['X-Accel-Redirect'] = internal_url
    response['Content-Disposition'] = 'attachment; filename="{}"'.format(filename)
    return response


def dummy_thumbnail_response(request, path):
    # Only used during testing to return thumbnail images. Everywhere else, Nginx handles these requests.
    path = str(Path(settings.THUMBNAIL_ROOT) / path)
    with open(path, 'rb') as f:
        return HttpResponse(f.read(), content_type='image/jpeg')
