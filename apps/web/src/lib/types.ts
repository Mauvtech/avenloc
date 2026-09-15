export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  roles: string[];
  identityStatus: string;
  stripeAccountStatus: string | null;
  createdAt: string;
}

export interface ListingPhoto {
  id: string;
  url: string;
  position: number;
  caption: string | null;
}

export interface ListingAvailability {
  id: string;
  listingId: string;
  startDate: string;
  endDate: string; // exclusif
  isAvailable: boolean;
}

// Règle de créneaux hebdomadaire (annonces pricingUnit = HOUR).
export interface ListingAvailabilityRule {
  id: string;
  listingId: string;
  dayOfWeek: number; // 0 = dimanche ... 6 = samedi
  startTime: string; // "08:00"
  endTime: string; // "19:00"
  minDurationMinutes: number;
  minLeadTimeMinutes: number;
}

// Créneau horaire disponible, calculé côté API (GET /listings/:id/slots).
export interface Slot {
  start: string; // ISO datetime
  end: string; // ISO datetime, exclusif
}

// Vue hôte d'un créneau (GET /listings/:id/slots/manage) — tous les créneaux
// du jour, avec statut, pour le calendrier de blocage.
export interface ManagedSlot {
  start: string;
  end: string;
  status: 'available' | 'booked' | 'blocked';
  availabilityId: string | null;
}

export interface Listing {
  id: string;
  hostId: string;
  type: string;
  status: string;
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
  pricingUnit: string;
  basePrice: string;
  cleaningFee: string | null;
  depositAmount: string | null;
  cancellationPolicy: string;
  instantBookEnabled: boolean;
  createdByCommercial: boolean;
  accessMethod: string;
  accessCode: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  contactPhone: string | null;
  rcProRequired: boolean;
  houseRules: string | null;
  faq: { question: string; reponse: string }[] | null;
  amenities: string[];
  specificAttributes: Record<string, unknown> | null;
  photos: ListingPhoto[];
  hostPaymentsReady?: boolean;
  host?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: string | null;
    verified: boolean;
  } | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  listingId: string;
  tenantId: string;
  status: string;
  startDate: string;
  endDate: string;
  unitCount: number;
  baseAmount: string;
  cleaningFee: string;
  serviceFee: string;
  taxAmount: string;
  totalAmount: string;
  guestCount: number;
  guestNote: string | null;
  arrivalTime: string | null;
  activityDescription: string | null;
  rcProConfirmed: boolean;
  houseRulesAccepted: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  rejectionReason: string | null;
  hostApprovalDeadline: string | null;
  hostApprovedAt: string | null;
  listing?: Partial<Listing> & Pick<Listing, 'title' | 'city' | 'type'>;
  tenant?: { firstName: string; lastName: string; avatarUrl: string | null };
  payment?: Payment | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  status: string;
  stripePaymentIntentId: string | null;
  amount: string;
  platformFee: string;
  hostPayout: string;
  refundedAmount: string;
}

export interface PartySummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  bookingId: string | null;
  tenantId: string;
  hostId: string;
  otherParty: PartySummary | null;
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  target: string;
  rating: number;
  comment: string | null;
  isPublic: boolean;
  listingId: string | null;
  tenantSubjectId: string | null;
  author?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface ReviewList {
  reviews: Review[];
  averageRating: number | null;
  total: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  type: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  basePrice: number;
  pricingUnit: string;
  maxGuests: number | null;
  amenities: string[];
  coverPhotoUrl: string | null;
  rating: number | null;
  reviewCount: number;
  hostVerified: boolean;
}

export interface Quote {
  unitCount: number;
  pricingUnit: string;
  basePrice: string;
  baseAmount: string;
  cleaningFee: string;
  serviceFee: string;
  taxAmount: string;
  totalAmount: string;
  depositAmount: string | null;
}

// Caution (empreinte bancaire) — voir note-technique-caution.md.
export type DepositStatus =
  | 'AUTHORIZED'
  | 'CAPTURE_REQUESTED'
  | 'CAPTURED'
  | 'CONTESTED'
  | 'RELEASED'
  | 'EXPIRED';

export interface Deposit {
  id: string;
  bookingId: string;
  status: DepositStatus;
  amount: string;
  capturedAmount: string | null;
  captureReason: string | null;
  captureRequestedAt: string | null;
  contestReason: string | null;
  contestedAt: string | null;
  capturedAt: string | null;
  releasedAt: string | null;
  proofUrls: string[];
  createdAt: string;
}

export interface SearchResult {
  listings: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchFacets {
  types: string[];
  amenities: string[];
  maxPrice: number;
}

export interface PendingReview {
  bookingId: string;
  possibleTargets: ('LISTING' | 'TENANT')[];
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'TENANT' | 'HOST';
}

export interface LoginData {
  email: string;
  password: string;
}
