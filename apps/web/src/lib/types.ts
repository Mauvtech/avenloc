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
  cancellationPolicy: string;
  instantBookEnabled: boolean;
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
}

export interface SearchResult {
  listings: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
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
