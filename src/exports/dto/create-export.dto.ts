import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ALLOWED_EXPORT_TYPES } from '../../common/constants/api.constants';

type ExportType = (typeof ALLOWED_EXPORT_TYPES)[number];

export class CreateExportDto {
  @IsUUID()
  @IsOptional()
  report_id?: string;

  @IsString()
  @IsNotEmpty()
  file_name: string;

  @IsString()
  @IsIn([...ALLOWED_EXPORT_TYPES])
  file_type: ExportType;

  @IsNumber()
  @IsOptional()
  file_size?: number;

  @IsString()
  @IsOptional()
  file_url?: string;

  @IsString()
  @IsOptional()
  storage_path?: string;

  @IsString()
  @IsOptional()
  expires_at?: string;
}
