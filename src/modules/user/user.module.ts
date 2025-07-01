import { Module } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { DatabaseModule } from 'src/database/database.module';
import { UserRepository } from 'src/modules/user/repositories/user.repository';

@Module({
	imports: [DatabaseModule],
	controllers: [],
	providers: [UserService, UserRepository],
	exports: [UserService],
})
export class UserModule {}
