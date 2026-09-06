import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { dirname, join, resolve, sep } from 'path';
import { StorageService } from './storage.service';

/**
 * Stockage sur disque local. Les fichiers sont écrits dans `storage.dir`
 * (par défaut `<cwd>/uploads`) et servis en statique sous `/uploads`
 * (voir main.ts). Suffisant pour le développement et un déploiement mono-instance.
 */
@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly dir: string;
  private readonly publicBase: string;

  constructor(config: ConfigService) {
    super();
    const configuredDir = config.get<string>('storage.dir');
    this.dir = resolve(configuredDir && configuredDir.length > 0 ? configuredDir : join(process.cwd(), 'uploads'));
    const apiUrl = config.get<string>('storage.publicUrl') ?? 'http://localhost:3001';
    this.publicBase = `${apiUrl.replace(/\/+$/, '')}/uploads`;
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const safeKey = this.normalizeKey(key);
    const fullPath = join(this.dir, safeKey);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return `${this.publicBase}/${safeKey}`;
  }

  async delete(urlOrKey: string): Promise<void> {
    let key = urlOrKey;
    if (key.startsWith(`${this.publicBase}/`)) {
      key = key.slice(this.publicBase.length + 1);
    }
    key = this.normalizeKey(key);
    const fullPath = join(this.dir, key);
    // Défense en profondeur contre le path traversal.
    if (!fullPath.startsWith(this.dir + sep)) {
      this.logger.warn(`delete: chemin hors du dossier de stockage ignoré (${urlOrKey})`);
      return;
    }
    await fs.unlink(fullPath).catch((err) => {
      this.logger.warn(`delete: échec pour ${key} — ${String(err)}`);
    });
  }

  private normalizeKey(key: string): string {
    return key.replace(/^\/+/, '').replace(/\.\.(\/|\\|$)/g, '');
  }
}
