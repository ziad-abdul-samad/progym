import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const sourceDirectory = path.resolve('public/images/gym');
const outputDirectory = path.join(sourceDirectory, 'optimized');
const sourceFiles = (await readdir(sourceDirectory))
  .filter((file) => /^WhatsApp Image .*\.jpeg$/i.test(file))
  .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

await mkdir(outputDirectory, { recursive: true });

await Promise.all(
  sourceFiles.map(async (file, index) => {
    const outputName = `gym-${String(index + 1).padStart(2, '0')}.webp`;
    await sharp(path.join(sourceDirectory, file))
      .rotate()
      .resize({
        fit: 'inside',
        height: 1280,
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true,
        width: 1280,
      })
      .webp({ effort: 5, quality: 82, smartSubsample: true })
      .toFile(path.join(outputDirectory, outputName));
  }),
);

console.log(`Generated ${sourceFiles.length} optimized WebGL textures in ${outputDirectory}`);
sourceFiles.forEach((file, index) => {
  console.log(`${file} -> gym-${String(index + 1).padStart(2, '0')}.webp`);
});
