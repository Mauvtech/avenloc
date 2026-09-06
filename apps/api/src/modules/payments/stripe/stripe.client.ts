import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClient {
  private readonly stripe: Stripe;

  constructor(config: ConfigService) {
    this.stripe = new Stripe(config.get<string>('stripe.secretKey') ?? '', {
      apiVersion: '2024-06-20',
    });
  }

  get client(): Stripe {
    return this.stripe;
  }
}
