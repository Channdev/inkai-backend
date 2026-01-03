import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CaptureOrderDto } from './dto/capture-order.dto';
import { PAYPAL_CONFIG } from '../common/constants/api.constants';

@Injectable()
export class PaypalService {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

  private getApiUrl(): string {
    const mode = this.configService.get<string>('PAYPAL_MODE') || 'sandbox';
    return mode === 'live' ? PAYPAL_CONFIG.LIVE_URL : PAYPAL_CONFIG.SANDBOX_URL;
  }

  private async getAccessToken(): Promise<string> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_SECRET');

    if (!clientId || !clientSecret) {
      throw new BadRequestException('PayPal credentials not configured');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const apiUrl = this.getApiUrl();

    const response = await fetch(`${apiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new BadRequestException(
        errorData.error_description || `Authentication failed: ${response.status}`,
      );
    }

    const data = await response.json();
    return data.access_token;
  }

  async createOrder(dto: CreateOrderDto) {
    const accessToken = await this.getAccessToken();
    const apiUrl = this.getApiUrl();

    const finalCurrency = dto.currency === 'PHP' ? 'PHP' : 'USD';
    const finalAmount = typeof dto.amount === 'number' ? dto.amount.toFixed(2) : String(dto.amount);

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: dto.planId,
          description: `InkAI ${dto.planId === 'pro' ? 'Business Pro' : 'Individual'} Plan`,
          amount: {
            currency_code: finalCurrency,
            value: finalAmount,
          },
        },
      ],
    };

    const response = await fetch(`${apiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const order = await response.json();

    if (!response.ok) {
      const errorMsg =
        order.details?.[0]?.description || order.message || 'Order creation failed';
      throw new BadRequestException(errorMsg);
    }

    return { orderId: order.id };
  }

  async captureOrder(dto: CaptureOrderDto, userId?: string) {
    const accessToken = await this.getAccessToken();
    const apiUrl = this.getApiUrl();

    const response = await fetch(`${apiUrl}/v2/checkout/orders/${dto.orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const captureData = await response.json();

    if (!response.ok) {
      const errorMsg =
        captureData.details?.[0]?.description || captureData.message || 'Capture failed';
      throw new BadRequestException(errorMsg);
    }

    if (userId && dto.planId && dto.amount && dto.currency) {
      const supabase = this.supabaseService.getClient();

      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (existingSubscription) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', existingSubscription.id);
      }

      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const { data: subscription } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: dto.planId === 'pro' ? 'pro' : 'standard',
          status: 'active',
          price_amount: dto.amount,
          currency: dto.currency,
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
        })
        .select()
        .single();

      if (subscription) {
        await supabase.from('payments').insert({
          user_id: userId,
          subscription_id: subscription.id,
          paypal_order_id: dto.orderId,
          paypal_payer_id: captureData.payer?.payer_id,
          amount: dto.amount,
          currency: dto.currency,
          status: 'completed',
          payment_method: 'paypal',
          metadata: {
            capture_id: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
          },
        });
      }
    }

    return {
      status: captureData.status,
      payer: captureData.payer,
    };
  }
}
