import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CaptureOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
