import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { UploadService } from './upload.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { ApiResponse } from '../common/types/api-response.type';

@Controller('v1/upload')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<ApiResponse> {
    const host = req.headers.host || 'localhost:3000';
    const data = await this.uploadService.uploadFile(file, host);
    return { success: true, data };
  }
}
