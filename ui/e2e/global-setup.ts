import { execSync } from 'child_process'

// Generates the image fixtures the specs reference at /data/photos inside the
// dev container. Idempotent — existing files are left untouched.
const GENERATE_FIXTURES = `
from PIL import Image
import os

os.makedirs('/data/photos', exist_ok=True)

# Solid colour images used by createTestPhotos() for carousel/navigation tests
colours = {
    'red': (255, 0, 0),
    'green': (0, 128, 0),
    'blue': (0, 0, 255),
    'yellow': (255, 255, 0),
    'cyan': (0, 255, 255),
}
for name, rgb in colours.items():
    path = f'/data/photos/test_{name}.jpg'
    if not os.path.exists(path):
        Image.new('RGB', (1920, 1080), rgb).save(path, 'JPEG', quality=90)

# 640x448 black/white checkerboard (64px squares) for tile alignment tests
path = '/data/photos/checkerboard.jpg'
if not os.path.exists(path):
    square = 64
    im = Image.new('RGB', (640, 448))
    px = im.load()
    for y in range(448):
        for x in range(640):
            px[x, y] = (255, 255, 255) if ((x // square) + (y // square)) % 2 == 0 else (0, 0, 0)
    im.save(path, 'JPEG', quality=95)

print('e2e fixtures ready')
`

export default function globalSetup() {
  const escaped = GENERATE_FIXTURES.replace(/"/g, '\\"')
  execSync(
    `docker compose -f docker/docker-compose.dev.yml exec -T photonix python -c "${escaped}"`,
    { cwd: process.cwd() + '/..', stdio: 'inherit' }
  )
}
