import { Controller, Post, Req, Res } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { Request, Response } from 'express';

@Controller('external-integrations')
export class ExternalIntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('paystack/webhook')
  async handlePaystackWebhook(@Req() req: Request, @Res() res: Response) {
    return this.integrationsService.handlePaystackWebhook(req, res);
  }
}
