import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database.module';
import { PrismaService } from '../prisma.service';

describe('DatabaseModule', () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [DatabaseModule],
		}).compile();
	});

	it('should provide PrismaService', () => {
		const prisma = module.get<PrismaService>(PrismaService);
		expect(prisma).toBeDefined();
	});
});
