import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

// Guard qui tente de valider le JWT mais ne lève pas d'erreur si absent ou invalide.
// Utiliser sur les endpoints publics qui bénéficient du contexte utilisateur quand disponible
// (ex : GET /listings/:id — un host voit ses brouillons, un visiteur voit seulement le PUBLISHED).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(ctx: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(ctx);
  }

  // Surcharge : ne pas lever d'exception si l'auth échoue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<T>(_err: unknown, user: T): T {
    return user; // null si absent/invalide — le service décide quoi faire
  }
}
