import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrgProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  provider?: string;
}
