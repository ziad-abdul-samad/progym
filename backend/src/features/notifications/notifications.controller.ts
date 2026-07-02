import { Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@Protected()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: {
        items: await this.notifications.listForUser(user.id),
        unread: await this.notifications.unreadCount(user.id),
      },
    };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.notifications.markRead(id, user.id) };
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.notifications.markAllRead(user.id) };
  }
}
