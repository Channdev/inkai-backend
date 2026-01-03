import { IsBoolean, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class UpdateExportDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsBoolean()
  @IsOptional()
  increment_download?: boolean;
}
