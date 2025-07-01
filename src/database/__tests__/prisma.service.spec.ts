import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
	let service: PrismaService;

	beforeEach(() => {
		service = new PrismaService();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	// 필요시 PrismaService의 메서드에 대한 mock 테스트 추가 가능
});
