import { IsInt, IsString, IsOptional, Min, Max, Matches } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateAvailabilityRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number = 0;

  @IsString()
  @Matches(HHMM, { message: 'startTime doit être au format HH:mm' })
  startTime: string = '08:00';

  @IsString()
  @Matches(HHMM, { message: 'endTime doit être au format HH:mm' })
  endTime: string = '19:00';

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  minDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  minLeadTimeMinutes?: number;
}

export class SlotDto {
  start: string = '';
  end: string = '';
}

// Vue hôte (calendrier) : tous les créneaux possibles du jour, avec leur statut —
// contrairement à SlotDto qui ne renvoie que les créneaux réservables. Voir
// ListingsService.getSlotsForManagement.
export class ManagedSlotDto {
  start: string = '';
  end: string = '';
  status: 'available' | 'booked' | 'blocked' = 'available';
  /** Présent uniquement si status === 'blocked' — permet de débloquer directement. */
  availabilityId: string | null = null;
}
