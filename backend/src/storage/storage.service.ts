import { BadRequestException, Injectable } from '@nestjs/common';
import { FileVisibility } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

import { PrismaService } from '../prisma/prisma.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class StorageService {
  private readonly uploadRoot = join(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  async saveImage(
    file: Express.Multer.File | undefined,
    ownerUserId: string | null,
    visibility: FileVisibility = FileVisibility.PRIVATE,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, and WebP images are allowed');
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image must be 5MB or smaller');
    }

    if (!file.buffer) {
      throw new BadRequestException('Invalid upload payload');
    }

    let safeBuffer: Buffer;
    try {
      const image = sharp(file.buffer, {
        failOn: 'warning',
        limitInputPixels: 40_000_000,
      });
      const metadata = await image.metadata();
      if (
        !metadata.width ||
        !metadata.height ||
        !['jpeg', 'png', 'webp'].includes(metadata.format ?? '')
      ) {
        throw new Error('Unsupported image content');
      }
      // rotate() applies EXIF orientation. Re-encoding strips EXIF and other metadata.
      safeBuffer = await image.rotate().jpeg({ mozjpeg: true, quality: 88 }).toBuffer();
    } catch {
      throw new BadRequestException('Uploaded file is not a valid safe image');
    }

    const now = new Date();
    const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const filename = `${randomUUID()}.jpg`;
    const storageKey = `${folder}/${filename}`;
    const absoluteFolder = join(this.uploadRoot, folder);

    await mkdir(absoluteFolder, { recursive: true });
    await writeFile(join(absoluteFolder, filename), safeBuffer);

    return this.prisma.fileAsset.create({
      data: {
        byteSize: safeBuffer.byteLength,
        blob: {
          create: {
            data: Uint8Array.from(safeBuffer),
          },
        },
        mimeType: 'image/jpeg',
        originalName: file.originalname,
        ownerUserId,
        storageKey,
        visibility,
      },
    });
  }

  getAbsolutePath(storageKey: string): string {
    return join(this.uploadRoot, storageKey);
  }

  async deleteAsset(id: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findUnique({ where: { id } });
    if (!asset) return;

    try {
      await unlink(this.getAbsolutePath(asset.storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    await this.prisma.fileAsset.delete({ where: { id } });
  }
}
