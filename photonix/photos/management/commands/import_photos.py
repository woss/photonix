from django.core.management.base import BaseCommand

from photonix.photos.models import Library
from photonix.photos.utils.organise import import_photos_from_dir
from photonix.photos.utils.system import missing_system_dependencies
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Copies all photos from one directory into structured data folder hierchy and creates relevant database records'

    def add_arguments(self, parser):
        parser.add_argument('paths', nargs='+')
        parser.add_argument('--library', help='ID of the library to import photos into (required if more than one library exists)')

    def import_photos(self, paths, library_id=None):
        missing = missing_system_dependencies(['exiftool', ])
        if missing:
            logger.critical('Missing dependencies: {}'.format(missing))
            exit(1)

        if library_id:
            try:
                library = Library.objects.get(id=library_id)
            except Library.DoesNotExist:
                logger.critical('No library exists with ID {}'.format(library_id))
                exit(1)
        else:
            libraries = list(Library.objects.all()[:2])
            if len(libraries) != 1:
                logger.critical('There should be exactly one library or you should specify one with --library')
                exit(1)
            library = libraries[0]

        for path in paths:
            import_photos_from_dir(path, library)

    def handle(self, *args, **options):
        self.import_photos(options['paths'], options['library'])
