import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IntelDto } from './dto/intel.dto';
import { RefineDto } from './dto/refine.dto';
import { StartDto } from './dto/start.dto';
import { cleanAIResponse, calculateTokens } from '../common/utils/helpers.util';
import {
  AI_API_BASE,
  MODEL_PROMPTS,
  REGION_CONTEXT,
  INDUSTRY_CONTEXT,
  TONE_INSTRUCTIONS,
  LENGTH_INSTRUCTIONS,
  API_CONSTANTS,
} from '../common/constants/api.constants';

@Injectable()
export class AiService {
  constructor(private supabaseService: SupabaseService) {}

  private async getSubscription(userId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    return subData && subData.length > 0 ? subData[0] : null;
  }

  private async checkTokenLimit(subscription: Record<string, unknown> | null) {
    const currentPlan = (subscription?.plan as string) || 'trial';
    const tokensUsed = (subscription?.tokens_used as number) || 0;
    const tokensLimit = (subscription?.tokens_limit as number) || API_CONSTANTS.DEFAULT_TOKENS_LIMIT;

    if (currentPlan !== 'pro' && tokensUsed >= tokensLimit) {
      throw new ForbiddenException('Token limit reached. Please upgrade your plan.');
    }

    return { tokensUsed, tokensLimit };
  }

  private async updateTokenUsage(subscriptionId: string, currentTokens: number, newTokens: number) {
    const supabase = this.supabaseService.getClient();
    await supabase
      .from('subscriptions')
      .update({ tokens_used: currentTokens + newTokens })
      .eq('id', subscriptionId);
  }

  private async logActivity(
    userId: string,
    type: string,
    title: string,
    description: string,
    tokensUsed: number,
  ) {
    const supabase = this.supabaseService.getClient();
    await supabase.from('activities').insert({
      user_id: userId,
      type,
      title,
      description,
      tokens_used: tokensUsed,
    });
  }

  async generateIntel(userId: string, dto: IntelDto) {
    const subscription = await this.getSubscription(userId);
    const { tokensUsed } = await this.checkTokenLimit(subscription);

    const modelKey = dto.model || 'professional';
    const systemPrompt =
      MODEL_PROMPTS.intel[modelKey as keyof typeof MODEL_PROMPTS.intel] ||
      MODEL_PROMPTS.intel.professional;
    const regionText =
      dto.region === 'custom' && dto.customRegion
        ? dto.customRegion
        : REGION_CONTEXT[dto.region || ''] || 'Global market';
    const industryText = INDUSTRY_CONTEXT[dto.industry || ''] || 'General business';
    const depthText = dto.depth === 'detailed' ? 'detailed' : 'brief';
    const timeText =
      dto.timeFocus === '12months'
        ? 'next 12 months'
        : dto.timeFocus === '6months'
          ? 'next 6 months'
          : 'current';

    const fullPrompt = `${systemPrompt}

STRICT OUTPUT RULES:
- Do NOT start with greetings or phrases like "Sure!", "Certainly!", "Here's", "I'll", "Let me"
- Do NOT add meta-commentary or explanations
- Do NOT be sarcastic, ironic, or use humor
- Do NOT include phrases like "Market Analysis Summary:" or similar headers before JSON
- Output ONLY valid JSON, nothing else

Market: "${dto.market.trim()}"
Context: ${regionText}, ${industryText}, ${depthText} analysis, ${timeText} focus.

Return this EXACT JSON structure only:

{"marketOverview":{"marketSize":"description","customerBehavior":"description","buyingMotivations":"description"},"targetAudience":{"demographics":"description","painPoints":"description","buyingTriggers":"description"},"competitorSnapshot":{"typicalCompetitors":"description","strengths":"description","weaknesses":"description"},"trendsOpportunities":{"emergingTrends":"description","marketGaps":"description","underservedNeeds":"description"},"recommendations":["action 1","action 2","action 3","action 4","action 5"]}

Start directly with { - no text before or after the JSON.`;

    const apiUrl = `${AI_API_BASE}?text=${encodeURIComponent(fullPrompt)}`;

    const aiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!aiResponse.ok) {
      throw new BadRequestException('AI service unavailable');
    }

    const aiData = await aiResponse.text();
    let rawResult: string | Record<string, unknown> = aiData;

    try {
      const parsed = JSON.parse(aiData);
      if (parsed.response) rawResult = parsed.response;
      else if (parsed.result) rawResult = parsed.result;
      else if (parsed.text) rawResult = parsed.text;
      else if (parsed.message) rawResult = parsed.message;
      else if (typeof parsed === 'string') rawResult = parsed;
      else if (typeof parsed === 'object') rawResult = parsed;
    } catch {
      rawResult = aiData;
    }

    if (typeof rawResult === 'string') {
      rawResult = cleanAIResponse(rawResult);
    }

    let structuredResult: Record<string, unknown> | null = null;

    if (typeof rawResult === 'object' && rawResult !== null && 'marketOverview' in rawResult) {
      structuredResult = rawResult;
    } else if (typeof rawResult === 'string') {
      const cleanedResult = rawResult
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .replace(/^\s*json\s*/i, '')
        .trim();

      const jsonPatterns = [
        /\{[\s\S]*"marketOverview"[\s\S]*"recommendations"[\s\S]*\}/,
        /\{[\s\S]*\}/,
      ];

      for (const pattern of jsonPatterns) {
        const match = cleanedResult.match(pattern);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (parsed.marketOverview && parsed.recommendations) {
              structuredResult = parsed;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (!structuredResult) {
        try {
          const directParse = JSON.parse(cleanedResult);
          if (directParse.marketOverview) {
            structuredResult = directParse;
          }
        } catch {
          structuredResult = null;
        }
      }
    }

    if (!structuredResult) {
      structuredResult = {
        marketOverview: {
          marketSize: 'Unable to analyze. Please try with a more specific market description.',
          customerBehavior: 'Data unavailable',
          buyingMotivations: 'Data unavailable',
        },
        targetAudience: {
          demographics: 'Data unavailable',
          painPoints: 'Data unavailable',
          buyingTriggers: 'Data unavailable',
        },
        competitorSnapshot: {
          typicalCompetitors: 'Data unavailable',
          strengths: 'Data unavailable',
          weaknesses: 'Data unavailable',
        },
        trendsOpportunities: {
          emergingTrends: 'Data unavailable',
          marketGaps: 'Data unavailable',
          underservedNeeds: 'Data unavailable',
        },
        recommendations: [
          'Please try again with a more detailed market description',
          'Include specific industry or niche details',
          'Mention your target location or region',
          'Describe your ideal customer',
          'Include any specific concerns or questions',
        ],
      };
    }

    const newTokensUsed = calculateTokens(dto.market, JSON.stringify(structuredResult));

    if (subscription) {
      await this.updateTokenUsage(subscription.id as string, tokensUsed, newTokensUsed);
    }

    await this.logActivity(
      userId,
      'intel',
      'Market Intel Generated',
      dto.market.trim().substring(0, 100),
      newTokensUsed,
    );

    return {
      result: structuredResult,
      structured: true,
      model: modelKey,
      tokensUsed: newTokensUsed,
    };
  }

  async refineContent(userId: string, dto: RefineDto) {
    const subscription = await this.getSubscription(userId);
    const { tokensUsed } = await this.checkTokenLimit(subscription);

    const modelKey = dto.model || 'professional';
    const systemPrompt =
      MODEL_PROMPTS.refine[modelKey as keyof typeof MODEL_PROMPTS.refine] ||
      MODEL_PROMPTS.refine.professional;
    const toneInstruction =
      dto.tone === 'custom' && dto.customTone
        ? dto.customTone
        : TONE_INSTRUCTIONS[dto.tone || ''] || TONE_INSTRUCTIONS.formal;
    const lengthInstruction = LENGTH_INSTRUCTIONS[dto.length || ''] || LENGTH_INSTRUCTIONS.medium;

    const fullPrompt = `${systemPrompt}

STRICT OUTPUT RULES:
- Do NOT start with greetings, acknowledgments, or phrases like "Sure!", "Certainly!", "Here's", "I'll", "Let me", "Great!"
- Do NOT add meta-commentary about what you're doing
- Do NOT be sarcastic, ironic, or use humor
- Do NOT include phrases like "upgraded version", "enhanced take", "here's the refined version"
- Output ONLY the refined content directly
- No explanations before or after the content

TONE: ${toneInstruction}

LENGTH: ${lengthInstruction}

Refine this content:

"""
${dto.content.trim()}
"""

Output the refined content only, starting immediately with the refined text.`;

    const apiUrl = `${AI_API_BASE}?text=${encodeURIComponent(fullPrompt)}`;

    const aiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!aiResponse.ok) {
      throw new BadRequestException('AI service unavailable');
    }

    const aiData = await aiResponse.text();
    let result = aiData;

    try {
      const parsed = JSON.parse(aiData);
      if (parsed.response) result = parsed.response;
      else if (parsed.result) result = parsed.result;
      else if (parsed.text) result = parsed.text;
      else if (parsed.message) result = parsed.message;
      else if (typeof parsed === 'string') result = parsed;
    } catch {
      result = aiData;
    }

    result = cleanAIResponse(result);

    const newTokensUsed = calculateTokens(dto.content, result);

    if (subscription) {
      await this.updateTokenUsage(subscription.id as string, tokensUsed, newTokensUsed);
    }

    await this.logActivity(
      userId,
      'refine',
      'Content Refined',
      dto.content.trim().substring(0, 80) + (dto.content.length > 80 ? '...' : ''),
      newTokensUsed,
    );

    return {
      result,
      model: modelKey,
      tone: dto.tone,
      length: dto.length,
      tokensUsed: newTokensUsed,
    };
  }

  async generateBrief(userId: string, dto: StartDto) {
    const subscription = await this.getSubscription(userId);
    const { tokensUsed } = await this.checkTokenLimit(subscription);

    const modelKey = dto.model || 'creative';
    const systemPrompt =
      MODEL_PROMPTS.start[modelKey as keyof typeof MODEL_PROMPTS.start] ||
      MODEL_PROMPTS.start.creative;
    const toneInstruction = dto.tone ? TONE_INSTRUCTIONS[dto.tone] || '' : '';

    const fullPrompt = `${systemPrompt}

${toneInstruction ? `${toneInstruction}\n\n` : ''}STRICT OUTPUT RULES:
- Do NOT start with greetings, acknowledgments, or phrases like "Sure!", "Certainly!", "Here's", "I'll", "Let me", "Great!", "Absolutely!"
- Do NOT add meta-commentary about what you're doing or going to do
- Do NOT be sarcastic, ironic, or use humor
- Do NOT include phrases like "upgraded version", "enhanced take", "here's a better version"
- Start IMMEDIATELY with the first section heading
- Output ONLY the strategic content in a clean, professional format

Business Objective: "${dto.objective.trim()}"

Generate a strategic brief with these sections:

1. Executive Summary
2. Key Objectives
3. Target Audience Analysis
4. Strategic Recommendations
5. Action Items
6. Success Metrics

${dto.imageUrl ? 'Context file/image provided. Incorporate relevant insights.' : ''}

Start directly with "## Executive Summary" - no preamble.`;

    let apiUrl = `${AI_API_BASE}?text=${encodeURIComponent(fullPrompt)}`;

    if (dto.imageUrl) {
      apiUrl += `&imageUrl=${encodeURIComponent(dto.imageUrl)}`;
    }

    const aiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!aiResponse.ok) {
      throw new BadRequestException('AI service unavailable');
    }

    const aiData = await aiResponse.text();
    let result = aiData;

    try {
      const parsed = JSON.parse(aiData);
      if (parsed.response) result = parsed.response;
      else if (parsed.result) result = parsed.result;
      else if (parsed.text) result = parsed.text;
      else if (parsed.message) result = parsed.message;
      else if (typeof parsed === 'string') result = parsed;
    } catch {
      result = aiData;
    }

    result = cleanAIResponse(result);

    const newTokensUsed = calculateTokens(dto.objective, result);

    if (subscription) {
      await this.updateTokenUsage(subscription.id as string, tokensUsed, newTokensUsed);
    }

    const supabase = this.supabaseService.getClient();
    try {
      await supabase.from('briefs').insert({
        user_id: userId,
        title: dto.objective.substring(0, 100),
        objective: dto.objective,
        model: modelKey,
        tone: dto.tone || null,
        result,
        tokens_used: newTokensUsed,
      });
    } catch {}

    await this.logActivity(
      userId,
      'brief',
      'Strategic Brief Generated',
      dto.objective.trim().substring(0, 80) + (dto.objective.length > 80 ? '...' : ''),
      newTokensUsed,
    );

    return {
      result,
      model: modelKey,
      tone: dto.tone || null,
      tokensUsed: newTokensUsed,
    };
  }
}
