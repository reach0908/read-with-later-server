import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RefreshTokenRepository {
	constructor(private readonly prisma: PrismaService) {}

	async findFirst(
		where: Prisma.RefreshTokenFindFirstArgs,
		prisma: PrismaService | Prisma.TransactionClient = this.prisma,
	) {
		return prisma.refreshToken.findFirst({
			...where,
		});
	}

	async deleteMany(
		where: Prisma.RefreshTokenDeleteManyArgs,
		prisma: PrismaService | Prisma.TransactionClient = this.prisma,
	) {
		return prisma.refreshToken.deleteMany({
			...where,
		});
	}

	async create(data: Prisma.RefreshTokenCreateInput, prisma: PrismaService | Prisma.TransactionClient = this.prisma) {
		return prisma.refreshToken.create({
			data: {
				...data,
			},
		});
	}
}
