import { Module } from '@nestjs/common';

import { FilesController } from './files.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [FilesController],
  exports: [StorageService],
  providers: [StorageService],
})
export class StorageModule {}
