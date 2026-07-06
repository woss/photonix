import sys
from photonix.photos.utils.metadata import (PhotoMetadata, parse_datetime)
import datetime


class EventModel:
    name = 'event'
    version = 20210505
    approx_ram_mb = 120
    max_num_workers = 2

    def predict(self, image_file, photo_file=None):
        metadata = PhotoMetadata(image_file)
        date_taken = None
        possible_date_keys = ['Date/Time Original', 'Date Time Original', 'Date/Time', 'Date Time', 'GPS Date/Time', 'Modify Date', 'File Modification Date/Time']
        for date_key in possible_date_keys:
            date_taken = parse_datetime(metadata.get(date_key))
            if date_taken:
                events = {
                    datetime.date(date_taken.year, 12, 25): "Christmas Day",
                    datetime.date(date_taken.year, 10, 31): "Halloween",
                    datetime.date(date_taken.year, 2, 14): "Valentine's Day",
                    datetime.date(date_taken.year, 12, 31): "New Year Start",
                    datetime.date(date_taken.year, 1, 1): "New Year End",
                }
                if events.get(date_taken.date()):
                    event_name = events[date_taken.date()]
                    # "New Year Start"/"New Year End" are internal keys - both
                    # New Year's Eve and New Year's Day photos get the same tag
                    if event_name.startswith("New Year"):
                        return ['New Year']
                    return [event_name]
        return []


def save_tags(photo, results, model):
    from photonix.classifiers.runners import get_or_create_tag
    from photonix.photos.models import PhotoTag

    for name in results:
        tag = get_or_create_tag(library=photo.library, name=name, type='E', source='C')
        PhotoTag(photo=photo, tag=tag, source='C', confidence=0.5, significance=0.5).save()


def run_on_photo(photo_id):
    from photonix.classifiers.runners import run_classifier_on_photo
    return run_classifier_on_photo('event', EventModel, photo_id, 'E', save_tags)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Argument required: image file path')
        exit(1)

    _, results = run_on_photo(sys.argv[1])

    print(results)
