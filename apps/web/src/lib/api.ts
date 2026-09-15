import type {
  TokenResponse,
  User,
  Listing,
  ListingPhoto,
  ListingAvailability,
  ListingAvailabilityRule,
  Slot,
  ManagedSlot,
  Booking,
  Conversation,
  Message,
  Review,
  ReviewList,
  SearchResult,
  SearchFacets,
  PendingReview,
  Quote,
  Deposit,
  RegisterData,
  LoginData,
} from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// Rafraîchissement silencieux du token d'accès (TTL 15 min). Une seule requête
// de refresh à la fois, partagée entre les appels concurrents.
let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('refresh failed');
        const t = (await r.json()) as { accessToken: string; refreshToken: string };
        localStorage.setItem('accessToken', t.accessToken);
        localStorage.setItem('refreshToken', t.refreshToken);
        return t.accessToken;
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const isForm =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    // Pour un envoi multipart, laisser le navigateur poser le Content-Type + boundary.
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Token expiré → on tente un refresh puis on rejoue une fois la requête.
  if (res.status === 401 && retryOn401 && !path.startsWith('/auth/')) {
    const newToken = await tryRefresh();
    if (newToken) return apiFetch<T>(path, options, false);
  }

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: 'Erreur réseau' })) as { message?: string };
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    register: (data: RegisterData) =>
      apiFetch<TokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: LoginData) =>
      apiFetch<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    forgotPassword: (email: string) =>
      apiFetch<{ devResetUrl?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      apiFetch<{ ok: true }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
    exchange: (code: string) =>
      apiFetch<TokenResponse>('/auth/exchange', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    me: () => apiFetch<User>('/users/me'),
    logout: (refreshToken: string) =>
      apiFetch<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
  },
  listings: {
    create: (data: unknown) =>
      apiFetch<Listing>('/listings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Création par un commercial (ou par l'hôte via le même wizard) pour le
    // compte d'un hôte identifié par email — voir ListingsService.createForHost.
    createCommercial: (data: unknown) =>
      apiFetch<{ listing: Listing; isNewHost: boolean; devActivationUrl: string | null }>(
        '/listings/commercial',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    getById: (id: string) => apiFetch<Listing>(`/listings/${id}`),
    update: (id: string, data: Record<string, unknown>) =>
      apiFetch<Listing>(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    search: (params: string) => apiFetch<SearchResult>(`/search?${params}`),
    facets: () => apiFetch<SearchFacets>('/search/facets'),
    mine: () => apiFetch<Listing[]>('/listings/me'),
    setStatus: (id: string, status: 'DRAFT' | 'PUBLISHED') =>
      apiFetch<Listing>(`/listings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    archive: (id: string) => apiFetch<void>(`/listings/${id}`, { method: 'DELETE' }),
    uploadPhoto: (id: string, file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<ListingPhoto>(`/listings/${id}/photos`, { method: 'POST', body: fd });
    },
    deletePhoto: (id: string, photoId: string) =>
      apiFetch<void>(`/listings/${id}/photos/${photoId}`, { method: 'DELETE' }),
    reorderPhotos: (id: string, order: string[]) =>
      apiFetch<ListingPhoto[]>(`/listings/${id}/photos/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ order }),
      }),
    // Calendrier de disponibilité
    availability: (id: string) =>
      apiFetch<ListingAvailability[]>(`/listings/${id}/availability`),
    unavailable: (id: string) =>
      apiFetch<{ start: string; end: string }[]>(`/listings/${id}/unavailable`),
    blockDates: (id: string, startDate: string, endDate: string) =>
      apiFetch<ListingAvailability>(`/listings/${id}/availability`, {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate, isAvailable: false }),
      }),
    unblock: (id: string, availId: string) =>
      apiFetch<void>(`/listings/${id}/availability/${availId}`, { method: 'DELETE' }),
    // Créneaux horaires (pricingUnit = HOUR)
    availabilityRules: (id: string) =>
      apiFetch<ListingAvailabilityRule[]>(`/listings/${id}/availability-rules`),
    addAvailabilityRule: (
      id: string,
      data: { dayOfWeek: number; startTime: string; endTime: string; minDurationMinutes?: number; minLeadTimeMinutes?: number },
    ) =>
      apiFetch<ListingAvailabilityRule>(`/listings/${id}/availability-rules`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteAvailabilityRule: (id: string, ruleId: string) =>
      apiFetch<void>(`/listings/${id}/availability-rules/${ruleId}`, { method: 'DELETE' }),
    slots: (id: string, date: string) =>
      apiFetch<Slot[]>(`/listings/${id}/slots?date=${date}`),
    slotsForManagement: (id: string, date: string) =>
      apiFetch<ManagedSlot[]>(`/listings/${id}/slots/manage?date=${date}`),
  },
  bookings: {
    create: (data: unknown) =>
      apiFetch<Booking>('/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    mine: () => apiFetch<Booking[]>('/bookings?role=tenant'),
    asHost: () => apiFetch<Booking[]>('/bookings?role=host'),
    getById: (id: string) => apiFetch<Booking>(`/bookings/${id}`),
    createPaymentIntent: (bookingId: string) =>
      apiFetch<{ clientSecret: string | null; paymentIntentId: string; simulated: boolean }>(
        '/payments/intent',
        { method: 'POST', body: JSON.stringify({ bookingId }) },
      ),
    approve: (id: string) =>
      apiFetch<Booking>(`/bookings/${id}/approve`, { method: 'POST' }),
    reject: (id: string, reason: string) =>
      apiFetch<Booking>(`/bookings/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    checkIn: (id: string) =>
      apiFetch<Booking>(`/bookings/${id}/check-in`, { method: 'POST' }),
    checkOut: (id: string) =>
      apiFetch<Booking>(`/bookings/${id}/check-out`, { method: 'POST' }),
    complete: (id: string) =>
      apiFetch<Booking>(`/bookings/${id}/complete`, { method: 'POST' }),
    cancel: (id: string) =>
      apiFetch<Booking>(`/bookings/${id}/cancel`, { method: 'POST' }),
    quote: (data: { listingId: string; startDate: string; endDate: string }) =>
      apiFetch<Quote>('/bookings/quote', { method: 'POST', body: JSON.stringify(data) }),
  },
  deposits: {
    get: (bookingId: string) => apiFetch<Deposit | null>(`/bookings/${bookingId}/deposit`),
    claim: (
      bookingId: string,
      data: { reason: string; amount: string; description: string },
      files: File[],
    ) => {
      const fd = new FormData();
      fd.append('reason', data.reason);
      fd.append('amount', data.amount);
      fd.append('description', data.description);
      files.forEach((f) => fd.append('files', f));
      return apiFetch<{ ok: true }>(`/bookings/${bookingId}/deposit/claim`, {
        method: 'POST',
        body: fd,
      });
    },
    respond: (bookingId: string, decision: 'accept' | 'contest', contestReason?: string) =>
      apiFetch<{ ok: true }>(`/bookings/${bookingId}/deposit/respond`, {
        method: 'POST',
        body: JSON.stringify({ decision, contestReason }),
      }),
  },
  conversations: {
    list: () => apiFetch<Conversation[]>('/conversations'),
    create: (data: unknown) =>
      apiFetch<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    messages: (id: string) =>
      apiFetch<Message[]>(`/conversations/${id}/messages`),
    send: (id: string, content: string) =>
      apiFetch<Message>(`/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    markRead: (id: string) =>
      apiFetch<void>(`/conversations/${id}/read`, { method: 'PATCH' }),
  },
  reviews: {
    create: (data: unknown) =>
      apiFetch<Review>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    byListing: (id: string) =>
      apiFetch<ReviewList>(`/listings/${id}/reviews`),
    pending: () => apiFetch<PendingReview[]>('/reviews/pending'),
  },
  users: {
    publicProfile: (id: string) =>
      apiFetch<{
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        bio: string | null;
        createdAt: string;
      }>(`/users/${id}`),
    becomeHost: () =>
      apiFetch<User>('/users/me/become-host', { method: 'POST' }),
    updateProfile: (data: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      phone?: string;
    }) => apiFetch<User>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    uploadAvatar: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiFetch<User>('/users/me/avatar', { method: 'POST', body: fd });
    },
  },
  payments: {
    connectStatus: () => apiFetch<ConnectStatus>('/payments/connect/status'),
    // Renvoie l'URL d'onboarding hébergée par Stripe (Connect Express).
    onboard: () =>
      apiFetch<{ url: string }>('/payments/connect/onboard', { method: 'POST' }),
  },
  features: {
    get: () => apiFetch<FeaturesResponse>('/features'),
    set: (patch: Partial<FeatureFlags>) =>
      apiFetch<FeaturesResponse>('/features', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
  },
};

export interface FeatureFlags {
  simulatePayments: boolean;
}
export interface FeaturesResponse {
  flags: FeatureFlags;
  adminEnabled: boolean;
}

export interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  status: string | null;
  last4: string | null;
  holderName: string | null;
}
