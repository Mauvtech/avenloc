export class PaymentIntentResponseDto {
  clientSecret: string | null;
  paymentIntentId: string;
  /** true en mode simulation : paiement déjà validé, pas de Stripe Elements à monter. */
  simulated: boolean;

  constructor(data: Partial<PaymentIntentResponseDto>) {
    this.clientSecret = data.clientSecret ?? null;
    this.paymentIntentId = data.paymentIntentId ?? '';
    this.simulated = data.simulated ?? false;
  }
}

export class ConnectOnboardDto {
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}

export class ConnectStatusDto {
  connected: boolean; // informations bancaires renseignées
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  status: string | null; // "active" | "pending" | "restricted" | null
  last4: string | null; // 4 derniers chiffres de l'IBAN
  holderName: string | null; // titulaire du compte

  constructor(data: Partial<ConnectStatusDto>) {
    this.connected = data.connected ?? false;
    this.chargesEnabled = data.chargesEnabled ?? false;
    this.payoutsEnabled = data.payoutsEnabled ?? false;
    this.detailsSubmitted = data.detailsSubmitted ?? false;
    this.status = data.status ?? null;
    this.last4 = data.last4 ?? null;
    this.holderName = data.holderName ?? null;
  }
}
