import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma, Article } from '@prisma/client';

@Injectable()
export class ArticleRepository {
	constructor(private readonly prisma: PrismaService) {}

	async create(data: Prisma.ArticleCreateInput): Promise<Article> {
		return this.prisma.article.create({ data });
	}

	async update(id: string, data: Prisma.ArticleUpdateInput): Promise<Article> {
		return this.prisma.article.update({ where: { id }, data });
	}

	async findById(id: string): Promise<Article | null> {
		return this.prisma.article.findUnique({ where: { id } });
	}

	async findBySourceUrl(sourceUrl: string): Promise<Article | null> {
		return this.prisma.article.findUnique({ where: { sourceUrl } });
	}
}
