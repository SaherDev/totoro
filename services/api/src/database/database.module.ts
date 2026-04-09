import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserSettingsEntity } from './entities/user-settings.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserSettingsEntity])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
