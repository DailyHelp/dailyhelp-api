import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactDto } from './contact.dto';
import { ContactService } from './contact.service';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a contact form message' })
  async submitContact(
    @Body() dto: ContactDto,
  ): Promise<{ message: string }> {
    await this.contactService.sendContactEmail(dto);
    return { message: 'Your message has been sent successfully.' };
  }
}
