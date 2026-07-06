import os
from pathlib import Path
import sys

import pytest
import tensorflow as tf


sys.path.insert(0, str(Path(__file__).parent.resolve()))
os.environ['ENV'] = 'test'


if __name__ == '__main__':
    pytest_args = ['tests']
    if len(sys.argv) > 1:
        pytest_args = sys.argv[1:]
        if not pytest_args[0].startswith('tests/'):
            pytest_args[0] = 'tests/' + pytest_args[0]
        if not pytest_args[0].endswith('.py'):
            pytest_args[0] = pytest_args[0] + '.py'

    cov = None
    if os.environ.get('COVERAGE'):
        import tempfile
        import coverage
        # Config lives here rather than in a .coveragerc because the dev
        # container only mounts selected paths, not the repository root.
        # The data file defaults somewhere writable as the source tree may
        # be mounted read-only in the container.
        data_file = os.environ.get('COVERAGE_FILE') or os.path.join(tempfile.mkdtemp(), 'coverage.dat')
        cov = coverage.Coverage(
            data_file=data_file,
            source=['photonix'],
            omit=[
                '*/migrations/*',
                'photonix/manage.py',
                'photonix/web/wsgi.py',
                'photonix/web/settings.py',
                'photonix/web/test_settings.py',
            ],
        )
        cov.start()

    result = pytest.main(pytest_args)

    if cov:
        cov.stop()
        cov.save()
        print()
        cov.report()

    exit(result)
