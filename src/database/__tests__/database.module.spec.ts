import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database.module';
import { PrismaService } from '../prisma.service';

describe('DatabaseModule', () => {
	let module: TestingModule;

	beforeEach(async () => {
		module = await Test.createTestingModule({
			imports: [DatabaseModule],
		}).compile();
	});

	afterEach(async () => {
		await module.close();
	});

	it('PrismaService를 제공한다', () => {
		const prisma = module.get<PrismaService>(PrismaService);
		expect(prisma).toBeDefined();
		expect(typeof prisma).toBe('object');
		expect(prisma).toHaveProperty('$connect');
	});

	it('PrismaService가 싱글톤으로 제공된다', () => {
		const prisma1 = module.get<PrismaService>(PrismaService);
		const prisma2 = module.get<PrismaService>(PrismaService);
		expect(prisma1).toBe(prisma2);
	});
});
