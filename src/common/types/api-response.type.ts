export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  redirectTo?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    limit: number;
    offset: number;
    total: number | null;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  users: SessionUser;
}
