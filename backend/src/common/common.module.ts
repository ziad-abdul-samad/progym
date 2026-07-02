import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CsrfGuard } from './guards/csrf.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  exports: [CsrfGuard, JwtAuthGuard, JwtModule, RolesGuard],
  imports: [JwtModule.register({ global: true })],
  providers: [CsrfGuard, JwtAuthGuard, RolesGuard],
})
export class CommonModule {}
