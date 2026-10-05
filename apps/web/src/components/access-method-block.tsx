import { ACCESS_METHOD_LABEL } from '@/lib/listing';
import type { AccessMethod } from '@/lib/types';

interface Props {
  accessMethod: AccessMethod | null;
  accessInstructions: string | null;
}

const ICON: Record<AccessMethod, string> = {
  CONNECTED_LOCK: '🔐',
  ACCESS_CODE: '🔢',
  KEY_BOX: '🗝️',
  QR_CODE: '📱',
  RECEPTION: '🛎️',
};

/** Révélé uniquement une fois la réservation confirmée — comme sur la fiche
 * annonce, où seule la méthode (sans les instructions) est mentionnée avant. */
export default function AccessMethodBlock({ accessMethod, accessInstructions }: Props) {
  if (!accessMethod) return null;

  return (
    <div className="space-y-1.5 rounded-md border border-line bg-canvas px-3.5 py-3 text-sm">
      <p className="font-semibold text-ink">
        {ICON[accessMethod]} Accès — {ACCESS_METHOD_LABEL[accessMethod] ?? accessMethod}
      </p>
      {accessInstructions ? (
        <p className="text-ink/80">{accessInstructions}</p>
      ) : (
        <p className="text-muted">L&apos;hôte vous communiquera les instructions d&apos;accès avant votre créneau.</p>
      )}
    </div>
  );
}
