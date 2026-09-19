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
  startAt: string;
  endAt: string; // exclusif
  isAvailable: boolean;
}

export interface ListingFaqItem {
  id: string;
  listingId: string;
  question: string;
  answer: string;
  position: number;
}

export interface Slot {
  startAt: string;
  endAt: string;
  available: boolean;
}

export type AccessMethod = 'CONNECTED_LOCK' | 'ACCESS_CODE' | 'KEY_BOX' | 'QR_CODE' | 'RECEPTION';

export interface Listing {
  verifiedAt?: string | null;
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
  amenities: string[];
  specificAttributes: Record<string, unknown> | null;

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

  photos: ListingPhoto[];
  availabilities?: ListingAvailability[];
  faqItems?: ListingFaqItem[];
  hostPaymentsReady?: boolean;
  host?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: string | null;
  } | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  listingId: string;
  tenantId: string;
  status: string;
  startAt: string;
  endAt: string;
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
  rcProAccepted: boolean;
  houseRulesAccepted: boolean;
  hostApprovalDeadline: string | null;
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
  criteria: string | null;
  isPublic: boolean;
  listingId: string | null;
  tenantSubjectId: string | null;
  listingTitle?: string;
  author?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface ReviewList {
  reviews: Review[];
  averageRating: number | null;
  total: number;
}

export interface SearchResultItem {
  verifiedAt?: string | null;
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

// ─── Module Commercial ──────────────────────────────────────────────────────

export interface Establishment {
  id: string;
  hostId: string;
  createdById: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  listings?: { id: string; title: string; status?: string }[];
  createdAt: string;
}

export type HostInvitationStatus = 'SENT' | 'ACCEPTED' | 'EXPIRED';

export interface HostInvitation {
  id: string;
  establishmentId: string;
  listingId: string | null;
  commercialId: string;
  status: HostInvitationStatus;
  hostEmail: string;
  hostFirstName: string | null;
  hostLastName: string | null;
  hostPhone: string | null;
  token: string;
  sentAt: string;
  acceptedAt: string | null;
  establishment?: Establishment;
  listing?: Partial<Listing> & Pick<Listing, 'id' | 'title' | 'status' | 'type'>;
  createdAt: string;
}

export interface CreateLeadResult {
  host: User;
  establishment: Establishment;
  listing: Listing;
  invitation: HostInvitation;
  devInvitationUrl?: string;
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
