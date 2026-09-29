import { Body, Controller, Get, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ExpenseDto, FinanceRangeDto, VoidExpenseDto } from './finance.dto';
import { FinanceService } from './finance.service';

@Controller('finance')
@Protected(UserRole.ADMIN, UserRole.OBSERVER)
class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  @Get('report')
  async report(@Query() query: FinanceRangeDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.finance.report(query, actor) };
  }
  @Post('expenses')
  async expense(@Body() dto: ExpenseDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.finance.addExpense(dto, actor) };
  }
  @Patch('expenses/:id/void')
  async void(
    @Param('id') id: string,
    @Body() dto: VoidExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return { data: await this.finance.voidExpense(id, dto.reason, actor) };
  }
}
@Module({ controllers: [FinanceController], providers: [FinanceService] })
export class FinanceModule {}
