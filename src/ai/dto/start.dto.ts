import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class StartDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  objective: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  tone?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
