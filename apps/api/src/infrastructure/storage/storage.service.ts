/**
 * Contrat de stockage de fichiers. Deux implémentations :
 * - LocalStorageService : disque local, servi via /uploads (défaut, aucune config).
 * - S3Service : bucket S3 / S3-compatible (si des identifiants S3 sont fournis).
 */
export abstract class StorageService {
  /** Enregistre le fichier sous `key` et renvoie son URL publique. */
  abstract upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;

  /** Supprime le fichier. Accepte la clé OU l'URL publique renvoyée par `upload`. */
  abstract delete(urlOrKey: string): Promise<void>;
}
