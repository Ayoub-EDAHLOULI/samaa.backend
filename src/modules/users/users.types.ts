import { Role } from "@prisma/client";

export interface CreateUserDto {
  displayName: string;
  email: string;
  password: string;
  role?: Role;
  isEmailVerified?: boolean;
}

export interface UpdateUserDto {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role?: Role;
  isEmailVerified?: boolean;
}

export interface UserResponse {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Samaa-specific stats shown on a user's dashboard
export interface UserStats {
  totalRecognitions: number;
  uniqueRecitersDiscovered: number;
  totalFavorites: number;
  mostDiscoveredReciter: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    count: number;
  } | null;
}
