import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class IntelDto {
  @IsString()
  @IsNotEmpty()
  market: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  customRegion?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  depth?: string;

  @IsString()
  @IsOptional()
  timeFocus?: string;
}
