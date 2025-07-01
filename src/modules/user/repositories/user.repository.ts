import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class UserRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findUnique(where: Prisma.UserWhereUniqueInput) {
		return this.prisma.user.findUnique({
			where,
		});
	}

	async create(data: Prisma.UserCreateInput) {
		return this.prisma.user.create({
			data,
		});
	}
}
