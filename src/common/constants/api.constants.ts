export const API_CONSTANTS = {
  SESSION_DURATION_DAYS: 7,
  SESSION_DURATION_MS: 7 * 24 * 60 * 60 * 1000,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  DEFAULT_TOKENS_LIMIT: 5000,
  DEFAULT_PAGINATION_LIMIT: 50,
  DEFAULT_PAGINATION_OFFSET: 0,
} as const;

export const AI_API_BASE = 'https://norch-project.gleeze.com/api/Gpt4.1nano';

export const PAYPAL_CONFIG = {
  SANDBOX_URL: 'https://api-m.sandbox.paypal.com',
  LIVE_URL: 'https://api-m.paypal.com',
} as const;

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const ALLOWED_EXPORT_TYPES = ['pdf', 'docx', 'txt', 'md', 'html', 'json'] as const;

export const MODEL_PROMPTS = {
  intel: {
    professional:
      'You are a professional market research analyst. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will". Output ONLY the requested JSON format. Never be sarcastic.',
    market:
      'You are an expert market intelligence analyst. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will". Output ONLY the requested JSON format. Never be sarcastic.',
  },
  refine: {
    creative:
      'You are a creative content editor. Refine content with flair and engaging language. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will", "Let me". Output ONLY the refined content. Never be sarcastic.',
    professional:
      'You are a professional content editor. Refine content with clarity, precision, and business-appropriate language. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will", "Let me". Output ONLY the refined content. Never be sarcastic.',
    local:
      'You are a Filipino content editor. Refine content and optionally translate or mix with Tagalog/Filipino when appropriate. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will", "Let me". Output ONLY the refined content. Never be sarcastic.',
  },
  start: {
    creative:
      'You are a creative strategist. Generate innovative and creative business strategies. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will", "Let me". Start directly with the content. Never be sarcastic. Output only the strategic content.',
    professional:
      'You are a professional business consultant. Generate formal, structured, and data-driven business strategies. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will", "Let me". Start directly with the content. Never be sarcastic. Output only the strategic content.',
    local:
      'You are a concise strategy assistant. Provide brief, direct, and practical business recommendations. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will", "Let me". Start directly with the content. Never be sarcastic. Output only the strategic content.',
    quick:
      'You are a rapid strategy generator. Provide quick, bullet-pointed strategic insights and action items. CRITICAL: Do NOT include any preamble, meta-commentary, or phrases like "Sure!", "Here is", "I will", "Let me". Start directly with the content. Never be sarcastic. Output only the strategic content.',
  },
} as const;

export const REGION_CONTEXT: Record<string, string> = {
  global: 'Global market',
  philippines: 'Philippine market',
  custom: '',
};

export const INDUSTRY_CONTEXT: Record<string, string> = {
  ecommerce: 'E-commerce industry',
  services: 'Service-based business',
  saas: 'SaaS/Software industry',
  local: 'Local business',
};

export const TONE_INSTRUCTIONS: Record<string, string> = {
  friendly:
    'Use a warm, approachable, and conversational tone. Be helpful and personable. Never be sarcastic or use humor that undermines the content.',
  formal:
    'Use a formal, professional tone. Maintain proper grammar and business etiquette. Never be sarcastic or playful.',
  persuasive:
    'Use persuasive language that motivates action. Highlight benefits and create urgency. Never be sarcastic or dismissive.',
  professional:
    'Write in a formal, business-appropriate tone. Use corporate language, avoid contractions, maintain objectivity. Structure content with clear headings and bullet points. Sound authoritative and data-driven. Never be sarcastic or playful.',
  casual:
    'Write in a friendly, conversational tone. Use everyday language and a relaxed style. Be approachable and easy to understand. Never be sarcastic or include jokes.',
  informative:
    'Write in an educational, informative tone. Focus on clarity, provide detailed explanations, use examples. Be thorough and instructive. Never be sarcastic or condescending.',
  creative:
    'Write in an imaginative, creative tone. Use vivid metaphors and storytelling elements. Be bold with ideas. Never be sarcastic, ironic, or use humor that undermines professionalism.',
  custom: '',
};

export const LENGTH_INSTRUCTIONS: Record<string, string> = {
  short:
    'Keep the output concise and brief. Remove unnecessary words. Aim for 50% of original length.',
  medium:
    'Maintain similar length to the original. Focus on improving quality without changing length significantly.',
  long: 'Expand the content with more details, examples, and elaboration. Aim for 150-200% of original length.',
};
