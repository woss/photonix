import os

from django.conf import settings
from django.urls import path, re_path
from django.contrib import admin
from graphql_jwt.decorators import jwt_cookie

from photonix.accounts.views import user_avatar
from photonix.photos.views import thumbnailer, dummy_thumbnail_response, photo_tile, photo_download
from photonix.web.views import CustomGraphQLView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Only expose the GraphiQL IDE in development; keep it off in production.
    path('graphql', jwt_cookie(CustomGraphQLView.as_view(graphiql=settings.DEBUG)), name='api'),
    # Serve original photos by their unguessable uuid rather than real filename.
    path('download/<uuid:photo_id>/', photo_download, name='photo_download'),
    # User avatars by unguessable user uuid (capability URL, cacheable).
    path('avatar/<uuid:user_id>.jpg', user_avatar, name='user_avatar'),
    re_path(r'thumbnailer/(?P<type>photo|photofile)/(?P<width>[0-9]+)x(?P<height>[0-9]+)_(?P<crop>cover|contain)_q(?P<quality>[0-9]+)/(?P<id>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/$', thumbnailer),
    # Deep zoom tiles for photo detail view (supports negative coordinates from Leaflet CRS.Simple)
    re_path(r'thumbnailer/tile/(?P<photo_id>[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12})/(?P<z>-?\d+)/(?P<x>-?\d+)/(?P<y>-?\d+)\.jpg$', photo_tile),
]

if os.environ.get('ENV') == 'test':
    urlpatterns.append(
        path('thumbnails/<path:path>', dummy_thumbnail_response)
    )
