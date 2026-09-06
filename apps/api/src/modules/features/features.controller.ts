import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeaturesService, type FeatureFlags } from './features.service';
import { UpdateFeaturesDto } from './dto/update-features.dto';

interface FeaturesResponse {
  flags: FeatureFlags;
  /** true si les flags peuvent être modifiés à chaud (dev/démo). */
  adminEnabled: boolean;
}

@Controller('features')
export class FeaturesController {
  constructor(
    private readonly features: FeaturesService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  get(): FeaturesResponse {
    return {
      flags: this.features.all(),
      adminEnabled: this.config.get<boolean>('features.adminEnabled') ?? false,
    };
  }

  @Patch()
  set(@Body() dto: UpdateFeaturesDto): FeaturesResponse {
    if (!this.config.get<boolean>('features.adminEnabled')) {
      throw new ForbiddenException(
        'La modification des flags est désactivée (FEATURES_ADMIN).',
      );
    }
    return {
      flags: this.features.set(dto),
      adminEnabled: true,
    };
  }
}
