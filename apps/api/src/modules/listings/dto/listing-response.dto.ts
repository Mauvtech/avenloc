import type {
  ListingType,
  ListingStatus,
  PricingUnit,
  CancellationPolicy,
  AccessMethod,
  ListingPhoto,
  ListingAvailability,
  ListingFaqItem,
} from '@prisma/client';

export class ListingResponseDto {
  id: string;
  hostId: string;
  type: ListingType;
  status: ListingStatus;
  verifiedAt: Date | null;
  title: string;
  description: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  maxGuests: number | null;
  pricingUnit: PricingUnit;
  basePrice: string; // Decimal serialized as string
  cleaningFee: string | null;
  depositAmount: string | null;
  serviceFeeRateOverride: string | null;
  cancellationPolicy: CancellationPolicy;
  instantBookEnabled: boolean;
  amenities: string[];
  specificAttributes: unknown;

  // Créneaux horaires
  openDays: number[];
  openStartTime: string;
  openEndTime: string;
  minDurationMinutes: number;
  minNoticeHours: number;

  // Conditions d'accès et d'usage
  accessMethod: AccessMethod | null;
  accessInstructions: string | null;
  activityValidationRequired: boolean;
  rcProRequired: boolean;
  houseRules: string | null;

  establishmentId: string | null;

  createdAt: Date;
  updatedAt: Date;
  photos: ListingPhoto[];
  availabilities?: ListingAvailability[];
  faqItems?: ListingFaqItem[];
  /** true si l'hôte a finalisé sa configuration d'encaissement (compte Stripe actif). */
  hostPaymentsReady: boolean;
  host: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: Date | null;
  } | null;
}
