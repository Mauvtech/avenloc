import type {
  ListingType,
  ListingStatus,
  PricingUnit,
  CancellationPolicy,
  AccessMethod,
  ListingPhoto,
  ListingAvailability,
} from '@prisma/client';

export class ListingResponseDto {
  id: string;
  hostId: string;
  type: ListingType;
  status: ListingStatus;
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
  createdByCommercial: boolean;
  accessMethod: AccessMethod;
  accessCode: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  contactPhone: string | null;
  rcProRequired: boolean;
  houseRules: string | null;
  faq: unknown;
  amenities: string[];
  specificAttributes: unknown;
  createdAt: Date;
  updatedAt: Date;
  photos: ListingPhoto[];
  availabilities?: ListingAvailability[];
  /** true si l'hôte a finalisé sa configuration d'encaissement (compte Stripe actif). */
  hostPaymentsReady: boolean;
  host: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: Date | null;
    /** Identité vérifiée — voir VerifiedBadge dans le design de référence. */
    verified: boolean;
  } | null;
}
