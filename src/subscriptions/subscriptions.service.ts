import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { TrialDto } from './dto/trial.dto';
import { generateSessionToken } from '../common/utils/helpers.util';
import { API_CONSTANTS } from '../common/constants/api.constants';

@Injectable()
export class SubscriptionsService {
  constructor(private supabaseService: SupabaseService) {}

  async findAll(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Failed to fetch subscriptions');
    }

    return { subscriptions };
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
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

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: dto.plan,
        status: 'active',
        price_amount: dto.priceAmount,
        currency: dto.currency,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      throw new BadRequestException('Failed to create subscription');
    }

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: userId,
      subscription_id: subscription.id,
      paypal_order_id: dto.paypalOrderId,
      paypal_payer_id: dto.paypalPayerId,
      amount: dto.priceAmount,
      currency: dto.currency,
      status: 'completed',
      payment_method: 'paypal',
    });

    if (paymentError) {
      throw new BadRequestException('Failed to record payment');
    }

    return { subscription };
  }

  async activateTrial(dto: TrialDto, ipAddress: string | null, userAgent: string | null) {
    const supabase = this.supabaseService.getClient();

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existingUser) {
      const { data: existingTrial } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', existingUser.id)
        .eq('plan', 'trial')
        .single();

      if (existingTrial) {
        throw new BadRequestException('You have already used your free trial');
      }
    }

    const tempPassword = generateSessionToken().slice(0, 16);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: '',
        is_trial: true,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', dto.email)
          .single();

        if (user) {
          const { data: existingTrial } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('plan', 'trial')
            .single();

          if (existingTrial) {
            throw new BadRequestException('You have already used your free trial');
          }
        }
      }
      throw new BadRequestException(authError.message);
    }

    if (!authData.user) {
      throw new BadRequestException('Failed to create user');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: authData.user.id,
        plan: 'trial',
        status: 'active',
        price_amount: 0,
        currency: 'USD',
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEndsAt.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      throw new BadRequestException('Failed to create trial subscription');
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + API_CONSTANTS.SESSION_DURATION_MS);

    await supabase.from('sessions').insert({
      user_id: authData.user.id,
      token: sessionToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    return {
      message: 'Trial activated successfully',
      subscription,
      trial_ends_at: trialEndsAt.toISOString(),
      session: {
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      },
    };
  }
}
