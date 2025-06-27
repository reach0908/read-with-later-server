import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateUserInput } from 'src/modules/user/dto/create-user.input';

@Injectable()
export class UserService {
	constructor(private readonly prisma: PrismaService) {}

	async findByEmail(email: string) {
		return this.prisma.user.findUnique({
			where: { email },
		});
	}

	async createUser(createUserInput: CreateUserInput) {
		return this.prisma.user.create({
			data: createUserInput,
		});
	}
}
