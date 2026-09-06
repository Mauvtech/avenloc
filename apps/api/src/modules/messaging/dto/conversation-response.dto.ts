export interface PartySummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export class MessageResponseDto {
  id: string = '';
  conversationId: string = '';
  senderId: string = '';
  senderRole: 'TENANT' | 'HOST' = 'TENANT';
  senderName: string = '';
  senderAvatarUrl: string | null = null;
  content: string = '';
  readAt: Date | null = null;
  createdAt: Date = new Date();
}

export class ConversationResponseDto {
  id: string = '';
  listingId: string = '';
  listingTitle: string = '';
  bookingId: string | null = null;
  tenantId: string = '';
  hostId: string = '';
  /** L'autre participant (hôte si je suis locataire, et inversement). */
  otherParty: PartySummary | null = null;
  lastMessage: MessageResponseDto | null = null;
  unreadCount: number = 0;
  createdAt: Date = new Date();
}
