const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

// Configuration
const INPUT_DIR = path.join(process.cwd(), 'Screenshots');
const OUTPUT_DIR = path.join(INPUT_DIR, 'resized');
const MAX_WIDTH = 200;
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function resizeFile(filePath, outPath) {
  try {
    const image = await Jimp.read(filePath);
    if (image.bitmap.width > MAX_WIDTH) {
      image.resize(MAX_WIDTH, Jimp.AUTO);
    }
    await image.quality(90).writeAsync(outPath);
    const { width, height } = image.bitmap;
    console.log(`${path.basename(filePath)} -> ${path.basename(outPath)} (${width}x${height})`);
  } catch (err) {
    console.error('Failed to process', filePath, err.message || err);
  }
}

async function main() {
  console.log('Starting screenshot resize.');
  if (!fs.existsSync(INPUT_DIR)) {
    console.error('Input directory not found:', INPUT_DIR);
    process.exit(1);
  }

  await ensureDir(OUTPUT_DIR);

  const files = fs.readdirSync(INPUT_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ALLOWED_EXT.includes(ext);
  });

  if (files.length === 0) {
    console.log('No images found in', INPUT_DIR);
    return;
  }

  for (const f of files) {
    const inputPath = path.join(INPUT_DIR, f);
    const outputPath = path.join(OUTPUT_DIR, f);
    // skip directories and non-files
    const stat = fs.statSync(inputPath);
    if (!stat.isFile()) continue;
    // process
    // eslint-disable-next-line no-await-in-loop
    await resizeFile(inputPath, outputPath);
  }

  console.log('Resizing complete. Resized images are in', OUTPUT_DIR);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
