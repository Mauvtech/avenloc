import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';

function buildMockPrisma() {
  return {
    listing: { findUnique: jest.fn() },
    conversation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

const TENANT_ID = 'tenant-uuid';
const HOST_ID = 'host-uuid';
const LISTING_ID = 'listing-uuid';
const CONVERSATION_ID = 'conv-uuid';

const mockConversation = {
  id: CONVERSATION_ID,
  listingId: LISTING_ID,
  bookingId: null,
  tenantId: TENANT_ID,
  hostId: HOST_ID,
  createdAt: new Date(),
  messages: [],
};

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(MessagingService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findOrCreateConversation ──────────────────────────────────────────────

  describe('findOrCreateConversation', () => {
    it('retourne une conversation existante sans en créer une nouvelle', async () => {
      prisma.listing.findUnique.mockResolvedValue({ id: LISTING_ID, hostId: HOST_ID });
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      prisma.message.count.mockResolvedValue(0);

      const result = await service.findOrCreateConversation(TENANT_ID, { listingId: LISTING_ID });

      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(result.id).toBe(CONVERSATION_ID);
    });

    it('crée une nouvelle conversation si inexistante', async () => {
      prisma.listing.findUnique.mockResolvedValue({ id: LISTING_ID, hostId: HOST_ID });
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(mockConversation);
      prisma.message.count.mockResolvedValue(0);

      await service.findOrCreateConversation(TENANT_ID, { listingId: LISTING_ID });

      expect(prisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_ID, hostId: HOST_ID }),
        }),
      );
    });

    it("lance BadRequestException si l'hôte tente d'initier avec lui-même", async () => {
      prisma.listing.findUnique.mockResolvedValue({ id: LISTING_ID, hostId: HOST_ID });

      await expect(
        service.findOrCreateConversation(HOST_ID, { listingId: LISTING_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lance NotFoundException si le listing est introuvable', async () => {
      prisma.listing.findUnique.mockResolvedValue(null);

      await expect(
        service.findOrCreateConversation(TENANT_ID, { listingId: 'unknown' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── sendMessage ────────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    const newMessage = {
      id: 'msg-uuid',
      conversationId: CONVERSATION_ID,
      senderId: TENANT_ID,
      senderRole: 'TENANT' as const,
      content: 'Bonjour !',
      readAt: null,
      createdAt: new Date(),
      bookingId: null,
    };

    it('envoie un message et retourne le MessageResponseDto', async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);
      prisma.message.create.mockResolvedValue(newMessage);

      const result = await service.sendMessage(CONVERSATION_ID, TENANT_ID, {
        content: 'Bonjour !',
      });

      expect(result.content).toBe('Bonjour !');
      expect(result.senderRole).toBe('TENANT');
    });

    it("lance ForbiddenException si le user n'est pas participant", async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);

      await expect(
        service.sendMessage(CONVERSATION_ID, 'other-user-id', { content: 'Intrusion' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── markAsRead ─────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it("marque les messages de l'autre participant comme lus", async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);
      prisma.message.updateMany.mockResolvedValue({ count: 3 });

      await service.markAsRead(CONVERSATION_ID, TENANT_ID);

      expect(prisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ senderRole: 'HOST', readAt: null }),
          data: { readAt: expect.any(Date) },
        }),
      );
    });

    it('lance ForbiddenException si non participant', async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);

      await expect(service.markAsRead(CONVERSATION_ID, 'stranger-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
