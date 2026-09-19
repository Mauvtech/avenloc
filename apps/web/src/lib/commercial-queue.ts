// File d'attente hors-ligne pour les fiches créées par un commercial en visite
// terrain — même esprit que le prototype (localStorage + resynchronisation
// automatique au retour du réseau).

import { api } from './api';

const KEY = 'aven:commercial:pending';

export interface PendingLead {
  id: string; // identifiant local (horodatage), pas l'id serveur
  payload: unknown;
  createdAt: string;
}

function readQueue(): PendingLead[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingLead[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingLead[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* stockage indisponible (navigation privée…) — tant pis, pas de file hors-ligne */
  }
}

export function listPendingLeads(): PendingLead[] {
  return readQueue();
}

export function queueLead(payload: unknown): void {
  const items = readQueue();
  items.push({ id: `local-${Date.now()}`, payload, createdAt: new Date().toISOString() });
  writeQueue(items);
}

export function removePendingLead(id: string): void {
  writeQueue(readQueue().filter((i) => i.id !== id));
}

/** Tente d'envoyer chaque fiche en attente ; ne retire de la file que celles
 * effectivement acceptées par le serveur. */
export async function flushPendingLeads(): Promise<number> {
  const items = readQueue();
  if (items.length === 0) return 0;

  let sent = 0;
  for (const item of items) {
    try {
      await api.commercial.createLead(item.payload);
      removePendingLead(item.id);
      sent++;
    } catch {
      // Toujours hors-ligne ou fiche invalide — reste en file, on continue les suivantes.
    }
  }
  return sent;
}
