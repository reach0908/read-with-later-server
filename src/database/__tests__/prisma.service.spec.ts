import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
	let service: PrismaService;
	let module: TestingModule;

	beforeEach(async () => {
		module = await Test.createTestingModule({
			providers: [PrismaService],
		}).compile();

		service = module.get<PrismaService>(PrismaService);
	});

	afterEach(async () => {
		await module.close();
	});

	it('PrismaService 인스턴스가 정의되어야 한다', () => {
		expect(service).toBeDefined();
	});

	it('PrismaService가 PrismaClient를 상속한다', () => {
		expect(service).toHaveProperty('$connect');
		expect(service).toHaveProperty('$disconnect');
		expect(service).toHaveProperty('$on');
	});

	it('onModuleInit에서 $connect를 호출한다', async () => {
		const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
		await service.onModuleInit();
		expect(connectSpy).toHaveBeenCalled();
		connectSpy.mockRestore();
	});
});
