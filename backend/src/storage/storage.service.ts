import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileVisibility } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { isAbsolute, join, relative, resolve } from 'path';
import sharp from 'sharp';

import { PrismaService } from '../prisma/prisma.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const STORAGE_MODES = new Set(['database', 'filesystem', 'hybrid']);

type StorageMode = 'database' | 'filesystem' | 'hybrid';

@Injectable()
export class StorageService {
  private readonly mode: StorageMode;
  private readonly uploadRoot: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const configuredMode = this.config.get<string>('FILE_STORAGE_MODE')?.trim().toLowerCase();
    this.mode = STORAGE_MODES.has(configuredMode ?? '')
      ? (configuredMode as StorageMode)
      : 'hybrid';

    const configuredRoot = this.config.get<string>('UPLOAD_ROOT')?.trim();
    this.uploadRoot = resolve(
      configuredRoot
        ? isAbsolute(configuredRoot)
          ? configuredRoot
          : join(process.cwd(), configuredRoot)
        : join(process.cwd(), 'uploads'),
    );
  }

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
    const shouldWriteFile = this.mode !== 'database';
    const shouldStoreBlob = this.mode !== 'filesystem';

    if (shouldWriteFile) {
      await mkdir(absoluteFolder, { recursive: true });
      await writeFile(join(absoluteFolder, filename), safeBuffer);
    }

    try {
      return await this.prisma.fileAsset.create({
        data: {
          byteSize: safeBuffer.byteLength,
          blob: shouldStoreBlob
            ? {
                create: {
                  data: Uint8Array.from(safeBuffer),
                },
              }
            : undefined,
          mimeType: 'image/jpeg',
          originalName: file.originalname,
          ownerUserId,
          storageKey,
          storageProvider: this.mode,
          visibility,
        },
      });
    } catch (error) {
      if (shouldWriteFile) {
        await unlink(this.getAbsolutePath(storageKey)).catch(() => undefined);
      }
      throw error;
    }
  }

  getAbsolutePath(storageKey: string): string {
    const absolutePath = resolve(this.uploadRoot, storageKey);
    const relativePath = relative(this.uploadRoot, absolutePath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Invalid storage path');
    }
    return absolutePath;
  }

  async deleteAsset(id: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findUnique({ where: { id } });
    if (!asset) return;

    if (asset.storageProvider !== 'database') {
      try {
        await unlink(this.getAbsolutePath(asset.storageKey));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }

    await this.prisma.fileAsset.delete({ where: { id } });
  }
}
