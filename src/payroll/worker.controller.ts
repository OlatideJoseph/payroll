import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { WorkerRunDto } from './dto/worker-run.dto';
import { WorkerGuard } from './guards/worker.guard';

@ApiTags('payroll-worker')
@ApiHeader({ name: 'x-worker-token', description: 'Static worker API key' })
@Controller('payroll/settlements')
export class WorkerController {
  constructor(private readonly payrollService: PayrollService) {}

  /** Called by a background worker when it's time to settle a company. */
  @UseGuards(WorkerGuard)
  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(@Body() dto: WorkerRunDto) {
    return this.payrollService.runForWorker(dto.companyId, dto.all ?? false);
  }
}
