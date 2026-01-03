import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  role?: string;
}
