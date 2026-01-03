import { Injectable, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { ALLOWED_FILE_TYPES, API_CONSTANTS } from '../common/constants/api.constants';

@Injectable()
export class UploadService {
  async uploadFile(file: Express.Multer.File, host: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_FILE_TYPES.includes(file.mimetype as (typeof ALLOWED_FILE_TYPES)[number])) {
      throw new BadRequestException('File type not allowed');
    }

    if (file.size > API_CONSTANTS.MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const ext = file.originalname.split('.').pop() || 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, file.buffer);

    const protocol = host.includes('localhost') ? 'http' : 'https';
    const fileUrl = `${protocol}://${host}/uploads/${filename}`;

    return {
      url: fileUrl,
      filename: file.originalname,
      type: file.mimetype,
      size: file.size,
    };
  }
}
