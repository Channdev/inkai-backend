import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaypalService } from './paypal.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CaptureOrderDto } from './dto/capture-order.dto';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1/paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Post('create-order')
  async createOrder(@Body() dto: CreateOrderDto): Promise<ApiResponse> {
    const data = await this.paypalService.createOrder(dto);
    return { success: true, data };
  }

  @Post('capture-order')
  async captureOrder(@Body() dto: CaptureOrderDto, @Req() req: Request): Promise<ApiResponse> {
    const userId = req['user']?.id;
    const data = await this.paypalService.captureOrder(dto, userId);
    return { success: true, data };
  }
}

@Controller('paypal')
export class LegacyPaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Post('create-order')
  async createOrder(@Body() dto: CreateOrderDto) {
    const data = await this.paypalService.createOrder(dto);
    return data;
  }

  @Post('capture-order')
  async captureOrder(@Body() dto: CaptureOrderDto) {
    const data = await this.paypalService.captureOrder(dto);
    return data;
  }
}
