import { IsEmail, IsNotEmpty } from 'class-validator';

export class TrialDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
