import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import type { ReviewResponseDto, ListingReviewsResponseDto } from './dto/review-response.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.create(user.id, dto);
  }

  @Get('listings/:id/reviews')
  findByListing(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<ListingReviewsResponseDto> {
    return this.reviewsService.findByListing(
      id,
      Math.max(1, parseInt(page, 10)),
      Math.min(50, parseInt(limit, 10)),
    );
  }

  @Get('users/:id/reviews')
  findByUser(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.findByUser(
      id,
      Math.max(1, parseInt(page, 10)),
      Math.min(50, parseInt(limit, 10)),
    );
  }

  @Get('reviews/pending')
  @UseGuards(JwtAuthGuard)
  findPending(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ bookingId: string; possibleTargets: string[] }[]> {
    return this.reviewsService.findPending(user.id);
  }
}
