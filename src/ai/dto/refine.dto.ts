import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RefineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  tone?: string;

  @IsString()
  @IsOptional()
  customTone?: string;

  @IsString()
  @IsOptional()
  length?: string;
}
