import { BadRequestException } from '@nestjs/common';

// Simplification assumée pour tout le projet (voir plan d'implémentation) :
// aucun fuseau horaire réel n'est géré. Une heure saisie "14:00" est stockée
// comme l'instant UTC 14:00:00Z, et réaffichée telle quelle côté front — pas
// de conversion DST. Cohérent tant que l'équipe et les hôtes sont sur le même
// fuseau (Europe/Paris) et qu'on ne compare jamais à une horloge tierce.

export interface ListingSchedule {
  openDays: number[]; // 0=dimanche .. 6=samedi
  openStartTime: string; // "HH:mm"
  openEndTime: string; // "HH:mm"
  minDurationMinutes: number;
  minNoticeHours: number;
}

export interface Slot {
  startAt: Date;
  endAt: Date;
  available: boolean;
}

const MS_PER_MIN = 60_000;

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Combine une date calendaire ("YYYY-MM-DD") et une heure locale ("HH:mm") en Date. */
export function combineDateAndTime(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm.padStart(5, '0')}:00.000Z`);
}

/** Génère la grille de créneaux d'une journée pour une annonce, sans tenir compte
 * des réservations déjà posées (voir markUnavailable pour ça). */
export function generateDaySlots(
  schedule: ListingSchedule,
  date: string,
  now: Date = new Date(),
): Slot[] {
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  if (!schedule.openDays.includes(dayOfWeek)) return [];

  const openMin = parseTimeToMinutes(schedule.openStartTime);
  const closeMin = parseTimeToMinutes(schedule.openEndTime);
  const step = Math.max(15, schedule.minDurationMinutes);
  const earliestStart = new Date(now.getTime() + schedule.minNoticeHours * 3600_000);

  const slots: Slot[] = [];
  for (let m = openMin; m + step <= closeMin; m += step) {
    const startAt = new Date(`${date}T00:00:00.000Z`);
    startAt.setUTCMinutes(m);
    const endAt = new Date(startAt.getTime() + step * MS_PER_MIN);
    slots.push({ startAt, endAt, available: startAt >= earliestStart });
  }
  return slots;
}

/** Marque indisponibles les créneaux qui chevauchent une plage occupée (réservation active ou blocage hôte). */
export function markUnavailable(slots: Slot[], busyRanges: { startAt: Date; endAt: Date }[]): Slot[] {
  return slots.map((slot) => {
    if (!slot.available) return slot;
    const overlaps = busyRanges.some((r) => slot.startAt < r.endAt && slot.endAt > r.startAt);
    return overlaps ? { ...slot, available: false } : slot;
  });
}

/** Vérifie qu'un créneau demandé respecte les horaires d'ouverture, la durée
 * minimale et le délai de réservation minimum de l'annonce. Lève une 400 sinon. */
export function assertWithinSchedule(
  schedule: ListingSchedule,
  startAt: Date,
  endAt: Date,
  now: Date = new Date(),
): void {
  const dayOfWeek = startAt.getUTCDay();
  if (!schedule.openDays.includes(dayOfWeek)) {
    throw new BadRequestException("L'annonce n'est pas ouverte ce jour-là");
  }

  const startMin = startAt.getUTCHours() * 60 + startAt.getUTCMinutes();
  const endMin = endAt.getUTCHours() * 60 + endAt.getUTCMinutes();
  const openMin = parseTimeToMinutes(schedule.openStartTime);
  const closeMin = parseTimeToMinutes(schedule.openEndTime);
  const sameDay = startAt.toISOString().slice(0, 10) === endAt.toISOString().slice(0, 10);

  if (!sameDay || startMin < openMin || endMin > closeMin) {
    throw new BadRequestException(
      `Ce créneau doit être compris entre ${schedule.openStartTime} et ${schedule.openEndTime}`,
    );
  }

  const durationMinutes = (endAt.getTime() - startAt.getTime()) / MS_PER_MIN;
  if (durationMinutes < schedule.minDurationMinutes) {
    throw new BadRequestException(
      `La durée minimale de réservation est de ${schedule.minDurationMinutes} minutes`,
    );
  }

  const earliestStart = new Date(now.getTime() + schedule.minNoticeHours * 3600_000);
  if (startAt < earliestStart) {
    throw new BadRequestException(
      `Cette annonce demande un délai minimum de ${schedule.minNoticeHours}h avant réservation`,
    );
  }
}
