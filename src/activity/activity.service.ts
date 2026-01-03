import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { API_CONSTANTS } from '../common/constants/api.constants';

@Injectable()
export class ActivityService {
  constructor(private supabaseService: SupabaseService) {}

  async getActivity(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const subscription = subData && subData.length > 0 ? subData[0] : null;

    const { data: userActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: sessions } = await supabase
      .from('sessions')
      .select('created_at, ip_address, user_agent')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    const now = new Date();
    const periodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end)
      : null;
    const daysRemaining = periodEnd
      ? Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const tokensUsed = subscription?.tokens_used || 0;
    const tokensTotal = subscription?.tokens_limit || API_CONSTANTS.DEFAULT_TOKENS_LIMIT;

    const activities: Array<{
      type: string;
      title: string;
      description: string;
      timestamp: string;
      tokens_used: number;
    }> = [];

    if (userActivities && userActivities.length > 0) {
      userActivities.forEach((a) => {
        activities.push({
          type: a.type || 'action',
          title: a.title,
          description: a.description,
          timestamp: a.created_at,
          tokens_used: a.tokens_used || 0,
        });
      });
    }

    if (sessions && sessions.length > 0) {
      sessions.forEach((s, idx) => {
        if (idx === 0) {
          activities.push({
            type: 'login',
            title: 'Current Session',
            description: 'Active now',
            timestamp: s.created_at,
            tokens_used: 0,
          });
        } else {
          activities.push({
            type: 'login',
            title: 'Session Started',
            description: `Logged in from ${s.ip_address || 'unknown location'}`,
            timestamp: s.created_at,
            tokens_used: 0,
          });
        }
      });
    }

    if (payments && payments.length > 0) {
      payments.forEach((p) => {
        activities.push({
          type: 'payment',
          title: 'Payment Completed',
          description: `${p.currency} ${p.amount} via ${p.payment_method}`,
          timestamp: p.created_at,
          tokens_used: 0,
        });
      });
    }

    if (subscription) {
      activities.push({
        type: 'subscription',
        title: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan Activated`,
        description: 'Subscription started',
        timestamp: subscription.created_at,
        tokens_used: 0,
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      activities: activities.slice(0, 8),
      usage: {
        tokensUsed,
        tokensTotal,
        daysRemaining,
        plan: subscription?.plan || 'free',
        periodEnd: subscription?.current_period_end || null,
      },
    };
  }
}
