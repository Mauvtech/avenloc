import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';

@Injectable()
export class S3Service extends StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly region: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly config: ConfigService) {
    super();
    this.bucket = this.config.get<string>('s3.bucket') ?? 'aven-media';
    this.endpoint = this.config.get<string>('s3.endpoint') ?? '';
    this.region = this.config.get<string>('s3.region') ?? 'eu-west-3';

    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint || undefined,
      credentials: {
        accessKeyId: this.config.get<string>('s3.accessKeyId') ?? '',
        secretAccessKey: this.config.get<string>('s3.secretAccessKey') ?? '',
      },
      forcePathStyle: !!this.endpoint, // requis pour les endpoints S3-compatibles (MinIO, etc.)
    });
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return this.getPublicUrl(key);
  }

  async delete(urlOrKey: string): Promise<void> {
    const key = this.toKey(urlOrKey);
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(`S3 delete failed for key ${key}: ${String(err)}`);
    }
  }

  private getPublicUrl(key: string): string {
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /** Retrouve la clé S3 à partir de la clé nue ou d'une URL publique. */
  private toKey(urlOrKey: string): string {
    if (!urlOrKey.startsWith('http')) return urlOrKey;
    try {
      const path = new URL(urlOrKey).pathname.replace(/^\/+/, '');
      return this.endpoint && path.startsWith(`${this.bucket}/`)
        ? path.slice(this.bucket.length + 1)
        : path;
    } catch {
      return urlOrKey;
    }
  }
}
