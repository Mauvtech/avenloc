import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import type { ConversationResponseDto, MessageResponseDto } from './dto/conversation-response.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  findOrCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.messagingService.findOrCreateConversation(user.id, dto);
  }

  @Get('conversations')
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<ConversationResponseDto[]> {
    return this.messagingService.findAllForUser(user.id);
  }

  @Get('conversations/:id/messages')
  findMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ): Promise<MessageResponseDto[]> {
    return this.messagingService.findMessages(
      id,
      user.id,
      Math.max(1, parseInt(page, 10)),
      Math.min(100, parseInt(limit, 10)),
    );
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messagingService.sendMessage(id, user.id, dto);
  }

  @Patch('conversations/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.messagingService.markAsRead(id, user.id);
  }
}
