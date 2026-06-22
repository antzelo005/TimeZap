export interface User {
  user_id: string;
  email: string;
  display_name?: string | null;
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

export interface ProfileUpdatePayload {
  email: string;
  display_name?: string | null;
  current_password?: string;
}

export interface ProfileUpdateResponse {
  message: string;
  token: string;
  user: User;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}

export interface PasswordChangeResponse {
  message: string;
}
