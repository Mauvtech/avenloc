import type { IdentityStatus, UserRole } from '@prisma/client';

export class UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  roles: UserRole[];
  identityStatus: IdentityStatus;
  stripeAccountStatus: string | null;
  createdAt: Date;
}

export class PublicUserProfileDto {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
}
