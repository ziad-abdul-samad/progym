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
  OwnerWithdrawalDto,
} from './finance.dto';
import { FinanceService } from './finance.service';
import { PayrollService } from './payroll.service';
import { OwnerWithdrawalsService } from './owner-withdrawals.service';
import { BarService } from './bar.service';
import {
  BarCashDto,
  BarProductDto,
  BarProductsQueryDto,
  BarSaleDto,
  UpdateBarProductDto,
} from './bar.dto';

@Controller('finance')
@Protected(UserRole.ADMIN, UserRole.OBSERVER)
class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly payroll: PayrollService,
    private readonly withdrawals: OwnerWithdrawalsService,
    private readonly bar: BarService,
  ) {}
  @Get('report')
  async report(@Query() query: FinanceRangeDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.finance.report(query, actor) };
  }
  @Post('expenses')
  async expense(@Body() dto: ExpenseDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.finance.addExpense(dto, actor) };
  }
  @Get('bar/products')
  async products(@Query() query: BarProductsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.bar.products(query, actor) };
  }
  @Post('bar/products')
  async product(@Body() dto: BarProductDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.bar.product(dto, actor) };
  }
  @Patch('bar/products/:id')
  async editProduct(
    @Param('id') id: string,
    @Body() dto: UpdateBarProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return { data: await this.bar.product(dto, actor, id) };
  }
  @Post('bar/sales')
  async sale(@Body() dto: BarSaleDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.bar.sale(dto, actor) };
  }
  @Post('bar/cash')
  async barCash(@Body() dto: BarCashDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.bar.cash(dto, actor) };
  }
  @Patch('bar/sales/:id/void')
  async voidSale(
    @Param('id') id: string,
    @Body() dto: VoidExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return { data: await this.bar.void('sale', id, dto.reason, actor) };
  }
  @Patch('bar/cash/:id/void')
  async voidBarCash(
    @Param('id') id: string,
    @Body() dto: VoidExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return { data: await this.bar.void('cash', id, dto.reason, actor) };
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
  @Post('owner-withdrawals')
  async withdrawal(@Body() dto: OwnerWithdrawalDto, @CurrentUser() actor: AuthenticatedUser) {
    return { data: await this.withdrawals.add(dto, actor) };
  }
  @Patch('owner-withdrawals/:id/void')
  async voidWithdrawal(
    @Param('id') id: string,
    @Body() dto: VoidExpenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return { data: await this.withdrawals.void(id, dto.reason, actor) };
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
@Module({
  controllers: [FinanceController],
  providers: [FinanceService, PayrollService, OwnerWithdrawalsService, BarService],
})
export class FinanceModule {}
