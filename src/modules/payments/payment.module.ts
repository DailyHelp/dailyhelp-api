import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  FlutterwaveConfiguration,
  PaymentConfiguration,
  PaystackConfiguration,
} from 'src/config/configuration';
import { PaymentGatewayService } from './payment-gateway.service';

@Module({
  imports: [
    ConfigModule.forFeature(PaystackConfiguration),
    ConfigModule.forFeature(FlutterwaveConfiguration),
    ConfigModule.forFeature(PaymentConfiguration),
  ],
  providers: [PaymentGatewayService],
  exports: [PaymentGatewayService],
})
export class PaymentModule {}
