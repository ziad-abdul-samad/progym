import { Body, Controller, Get, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Protected } from '../../common/decorators/protected.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  ExpenseDto,
  FinanceRangeDto,
  VoidExpenseDto,
  SalaryRecipientsQueryDto,
  SalaryRecipientDto,
  UpdateSalaryRecipientDto,
  SalaryRecipientStatusDto,
  SalaryPaymentDto,
} from './finance.dto';
import { FinanceService } from './finance.service';
import { PayrollService } from './payroll.service';

@Controller('finance')
@Protected(UserRole.ADMIN, UserRole.OBSERVER)
class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly payroll: PayrollService,
  ) {}
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
  @Get('salary-recipients')
  async recipients(
    @Query() query: SalaryRecipientsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return { data: await this.payroll.recipients(query, actor) };
  }
  @Post('salary-recipients')
  async createRecipient(@Body() dto: SalaryRecipientDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.payroll.createRecipient(dto, actor) };
  }
  @Patch('salary-recipients/:id')
  async updateRecipient(
    @Param('id') id: string,
    @Body() dto: UpdateSalaryRecipientDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return { data: await this.payroll.updateRecipient(id, dto, actor) };
  }
  @Patch('salary-recipients/:id/status')
  async recipientStatus(
    @Param('id') id: string,
    @Body() dto: SalaryRecipientStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return { data: await this.payroll.status(id, dto, actor) };
  }
  @Post('salary-payments')
  async salaryPayment(@Body() dto: SalaryPaymentDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.payroll.pay(dto, actor) };
  }
}
@Module({ controllers: [FinanceController], providers: [FinanceService, PayrollService] })
export class FinanceModule {}
