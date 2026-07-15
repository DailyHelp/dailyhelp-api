import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { Request, Response } from 'express';

@Controller('external-integrations')
export class ExternalIntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('paystack/webhook')
  async handlePaystackWebhook(@Req() req: Request, @Res() res: Response) {
    return this.integrationsService.handlePaystackWebhook(req, res);
  }

  @Get('paystack/success')
  paystackSuccessCallback() {
    return {
      status: true,
      message: 'Paystack payment completed. You can close this page.',
    };
  }

  @Post('flutterwave/webhook')
  async handleFlutterwaveWebhook(@Req() req: Request, @Res() res: Response) {
    return this.integrationsService.handleFlutterwaveWebhook(req, res);
  }

  @Get('flutterwave/success')
  flutterwaveSuccessCallback() {
    return {
      status: true,
      message: 'Flutterwave payment completed. You can close this page.',
    };
  }
}
