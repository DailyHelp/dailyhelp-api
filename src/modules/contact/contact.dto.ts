import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ContactDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'janedoe@example.com' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'I would like to enquire about...' })
  @IsNotEmpty({ message: 'Message is required' })
  @IsString()
  @MaxLength(2000)
  message: string;
}
