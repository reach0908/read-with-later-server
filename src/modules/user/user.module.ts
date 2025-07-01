import { Module } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { DatabaseModule } from 'src/database/database.module';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { UserController } from 'src/modules/user/user.controller';

@Module({
	imports: [DatabaseModule],
	controllers: [UserController],
	providers: [UserService, UserRepository],
	exports: [UserService],
})
export class UserModule {}
