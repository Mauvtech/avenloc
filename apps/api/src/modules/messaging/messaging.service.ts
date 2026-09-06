import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MessageSenderRole, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { CreateConversationDto } from './dto/create-conversation.dto';
import type { SendMessageDto } from './dto/send-message.dto';
import type {
  ConversationResponseDto,
  MessageResponseDto,
} from './dto/conversation-response.dto';

const PARTY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

const CONV_INCLUDE = {
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
  listing: { select: { title: true } },
  tenant: { select: PARTY_SELECT },
  host: { select: PARTY_SELECT },
} as const;

type ConvWithRelations = Prisma.ConversationGetPayload<{
  include: typeof CONV_INCLUDE;
}>;

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, hostId: true },
    });
    if (!listing) throw new NotFoundException('Annonce introuvable');
    if (listing.hostId === userId) {
      throw new BadRequestException(
        "L'hôte ne peut pas initier une conversation avec lui-même",
      );
    }

    const where = {
      tenantId: userId,
      hostId: listing.hostId,
      listingId: dto.listingId,
      bookingId: dto.bookingId ?? null,
    };

    const existing = await this.prisma.conversation.findFirst({
      where,
      include: CONV_INCLUDE,
    });
    if (existing) return this.toConversationResponse(existing, userId);

    const created = await this.prisma.conversation.create({
      data: where,
      include: CONV_INCLUDE,
    });
    return this.toConversationResponse(created, userId);
  }

  /**
   * Ouvre (une seule fois) la conversation liée à une réservation confirmée,
   * avec un premier message récapitulatif du locataire. Idempotent.
   */
  async ensureBookingConversation(bookingId: string): Promise<void> {
    const existing = await this.prisma.conversation.findUnique({
      where: { bookingId },
      select: { id: true },
    });
    if (existing) return;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tenantId: true,
        listingId: true,
        startDate: true,
        endDate: true,
        arrivalTime: true,
        guestNote: true,
        listing: { select: { hostId: true } },
      },
    });
    if (!booking || booking.listing.hostId === booking.tenantId) return;

    const conversation = await this.prisma.conversation.create({
      data: {
        bookingId: booking.id,
        listingId: booking.listingId,
        tenantId: booking.tenantId,
        hostId: booking.listing.hostId,
      },
    });

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const parts = [
      `Bonjour, réservation confirmée du ${fmt(booking.startDate)} au ${fmt(booking.endDate)}.`,
    ];
    if (booking.arrivalTime) parts.push(`Heure d'arrivée prévue : ${booking.arrivalTime}.`);
    if (booking.guestNote) parts.push(booking.guestNote);

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: booking.tenantId,
        senderRole: MessageSenderRole.TENANT,
        content: parts.join(' '),
      },
    });
  }

  async findAllForUser(userId: string): Promise<ConversationResponseDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ tenantId: userId }, { hostId: userId }] },
      include: CONV_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    const withActivity = await Promise.all(
      conversations.map((c) => this.toConversationResponse(c, userId)),
    );
    // Les plus récemment actives d'abord.
    return withActivity.sort(
      (a, b) =>
        new Date(b.lastMessage?.createdAt ?? b.createdAt).getTime() -
        new Date(a.lastMessage?.createdAt ?? a.createdAt).getTime(),
    );
  }

  async findMessages(
    conversationId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<MessageResponseDto[]> {
    await this.assertParticipant(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { sender: { select: PARTY_SELECT } },
    });

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderRole: m.senderRole,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`.trim(),
      senderAvatarUrl: m.sender.avatarUrl,
      content: m.content,
      readAt: m.readAt,
      createdAt: m.createdAt,
    }));
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const conversation = await this.assertParticipant(conversationId, userId);

    const senderRole: MessageSenderRole =
      conversation.tenantId === userId
        ? MessageSenderRole.TENANT
        : MessageSenderRole.HOST;

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, senderRole, content: dto.content },
      include: { sender: { select: PARTY_SELECT } },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`.trim(),
      senderAvatarUrl: message.sender.avatarUrl,
      content: message.content,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.assertParticipant(conversationId, userId);

    const otherSenderRole: MessageSenderRole =
      conversation.tenantId === userId
        ? MessageSenderRole.HOST
        : MessageSenderRole.TENANT;

    await this.prisma.message.updateMany({
      where: { conversationId, senderRole: otherSenderRole, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation introuvable');
    if (conversation.tenantId !== userId && conversation.hostId !== userId) {
      throw new ForbiddenException('Accès non autorisé à cette conversation');
    }
    return conversation;
  }

  private async toConversationResponse(
    conversation: ConvWithRelations,
    userId: string,
  ): Promise<ConversationResponseDto> {
    const isTenant = conversation.tenantId === userId;
    const otherSenderRole = isTenant
      ? MessageSenderRole.HOST
      : MessageSenderRole.TENANT;
    const other = isTenant ? conversation.host : conversation.tenant;

    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderRole: otherSenderRole,
        readAt: null,
      },
    });

    const lastMessage = conversation.messages[0] ?? null;

    return {
      id: conversation.id,
      listingId: conversation.listingId,
      listingTitle: conversation.listing.title,
      bookingId: conversation.bookingId,
      tenantId: conversation.tenantId,
      hostId: conversation.hostId,
      otherParty: other
        ? {
            id: other.id,
            firstName: other.firstName,
            lastName: other.lastName,
            avatarUrl: other.avatarUrl,
          }
        : null,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            conversationId: lastMessage.conversationId,
            senderId: lastMessage.senderId,
            senderRole: lastMessage.senderRole,
            senderName: '',
            senderAvatarUrl: null,
            content: lastMessage.content,
            readAt: lastMessage.readAt,
            createdAt: lastMessage.createdAt,
          }
        : null,
      unreadCount,
      createdAt: conversation.createdAt,
    };
  }
}
