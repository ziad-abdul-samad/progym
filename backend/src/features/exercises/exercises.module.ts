import { Module } from '@nestjs/common';

import { MembershipsModule } from '../memberships/memberships.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  controllers: [ExercisesController],
  exports: [ExercisesService],
  imports: [MembershipsModule],
  providers: [ExercisesService],
})
export class ExercisesModule {}
