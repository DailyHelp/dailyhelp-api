import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Welcome to DailyHelp API!!!';
  }

  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
