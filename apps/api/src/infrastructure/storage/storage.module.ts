import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { S3Service } from './s3.service';
import { LocalStorageService } from './local-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: StorageService,
      // S3 si des identifiants sont fournis, sinon disque local (défaut).
      useFactory: (config: ConfigService): StorageService => {
        const hasS3 = !!config.get<string>('s3.accessKeyId');
        return hasS3 ? new S3Service(config) : new LocalStorageService(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
