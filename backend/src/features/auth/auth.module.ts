import { Module } from '@nestjs/common';

import { StorageModule } from '../../storage/storage.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  imports: [MembershipsModule, StorageModule],
  providers: [AuthService],
})
export class AuthModule {}
