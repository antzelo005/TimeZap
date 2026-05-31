export interface User {
  user_id: string;
  email: string;
  timezone: string;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}
