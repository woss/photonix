from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404


def user_avatar(request, user_id):
    # Deliberately unauthenticated: keyed by the user's unguessable uuid4 so
    # responses are cacheable, following the same capability-URL design as
    # thumbnail/tile/download endpoints. The `?v=` cache-buster changes on
    # re-upload, so long-lived caching is safe.
    path = Path(settings.DATA_DIR) / 'cache' / 'avatars' / f'{user_id}.jpg'
    if not path.exists():
        raise Http404('No avatar for this user')
    response = FileResponse(open(path, 'rb'), content_type='image/jpeg')
    response['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response
