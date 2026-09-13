import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DepositsService } from '../deposits.service';

@Injectable()
export class DepositLifecycleJob {
  constructor(private readonly deposits: DepositsService) {}

  // Pose l'empreinte pour les séjours qui approchent (réservations lointaines
  // non couvertes à la confirmation du paiement — voir note-technique-caution.md).
  @Cron('0 6 * * *')
  authorizePendingDeposits(): Promise<void> {
    return this.deposits.authorizePendingDeposits();
  }

  // Renouvelle les empreintes sur le point d'expirer chez Stripe (~7 jours).
  @Cron('0 * * * *')
  renewExpiringHolds(): Promise<void> {
    return this.deposits.renewExpiringHolds();
  }

  // Capture automatiquement une réclamation restée sans réponse après 48h.
  @Cron('*/30 * * * *')
  autoResolveExpiredClaims(): Promise<void> {
    return this.deposits.autoResolveExpiredClaims();
  }

  // Libère les empreintes des séjours terminés sans réclamation dans les 48h.
  @Cron('20 * * * *')
  releaseUnclaimedDeposits(): Promise<void> {
    return this.deposits.releaseUnclaimedDeposits();
  }
}
