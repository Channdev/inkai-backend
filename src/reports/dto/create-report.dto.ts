import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  content_html?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsUUID()
  @IsOptional()
  project_id?: string;

  @IsUUID()
  @IsOptional()
  template_id?: string;

  @IsString()
  @IsOptional()
  report_type?: string;

  @IsOptional()
  input_data?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  ai_model?: string;

  @IsNumber()
  @IsOptional()
  tokens_used?: number;

  @IsNumber()
  @IsOptional()
  generation_time_ms?: number;
}
