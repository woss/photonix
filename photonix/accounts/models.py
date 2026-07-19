from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import AbstractUser

from photonix.common.models import UUIDModel, VersionedModel
from django.db import models


class User(UUIDModel, AbstractUser):
    has_set_personal_info = models.BooleanField(default=False, help_text='User has set their personal info')
    has_created_library = models.BooleanField(default=False, help_text='User has created a library')
    has_configured_importing = models.BooleanField(default=False, help_text='User has configured photo importing')
    has_configured_image_analysis = models.BooleanField(default=False, help_text='User has configured image analysis')
    avatar_updated_at = models.DateTimeField(blank=True, null=True, help_text='When the avatar image was last uploaded (null means no avatar)')

    def avatar_path(self):
        # Avatars live under cache/ because the /data mount point itself is
        # not writable — the container only mounts individual subdirectories
        # (same reasoning as the persisted SECRET_KEY file).
        return Path(settings.DATA_DIR) / 'cache' / 'avatars' / f'{self.id}.jpg'

    @property
    def avatar_url(self):
        if not self.avatar_updated_at:
            return None
        return f'/avatar/{self.id}.jpg?v={int(self.avatar_updated_at.timestamp())}'
