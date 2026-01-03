import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  plan: string;

  @IsNumber()
  @IsNotEmpty()
  priceAmount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  paypalOrderId?: string;

  @IsString()
  @IsOptional()
  paypalPayerId?: string;
}
