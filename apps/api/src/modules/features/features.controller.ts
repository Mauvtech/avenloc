import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { FeaturesService, type FeatureFlags } from './features.service';
import { UpdateFeaturesDto } from './dto/update-features.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

interface FeaturesResponse {
  flags: FeatureFlags;
}

@Controller('features')
export class FeaturesController {
  constructor(private readonly features: FeaturesService) {}

  // Public : le front doit pouvoir lire les flags pour adapter l'UI (bannières
  // de paiement, etc.) même pour un visiteur non connecté.
  @Get()
  get(): FeaturesResponse {
    return { flags: this.features.all() };
  }

  // Seul un compte ADMIN peut modifier les flags — c'est le seul verrou
  // (avant, n'importe qui pouvait les changer hors production via FEATURES_ADMIN).
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async set(@Body() dto: UpdateFeaturesDto): Promise<FeaturesResponse> {
    return { flags: await this.features.set(dto) };
  }
}
