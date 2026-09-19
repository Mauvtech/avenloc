import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommercialService } from './commercial.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('commercial')
export class CommercialController {
  constructor(private readonly commercialService: CommercialService) {}

  @Get('establishments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMMERCIAL')
  findEstablishments(@Query('hostEmail') hostEmail: string) {
    return this.commercialService.findEstablishmentsByHostEmail(hostEmail);
  }

  @Post('leads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMMERCIAL')
  @HttpCode(HttpStatus.CREATED)
  createLead(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.commercialService.createLead(dto, user);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMMERCIAL')
  getHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.commercialService.getHistory(user.id);
  }

  // Public : consultée depuis le lien d'invitation, avant que l'hôte n'ait de compte actif.
  @Get('invitations/:token')
  getInvitation(@Param('token') token: string) {
    return this.commercialService.getInvitationPreview(token);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.commercialService.acceptInvitation(token, dto);
  }
}
