export interface RegisterDto {
  displayName: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isEmailVerified: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface VerifyEmailDto {
  token: string;
}
