import { RefreshTokenRepository } from '../refresh-token.repository';
import { PrismaService } from 'src/database/prisma.service';

describe('RefreshTokenRepository', () => {
	let repo: RefreshTokenRepository;
	let prisma: PrismaService;

	beforeEach(() => {
		prisma = {
			refreshToken: {
				findFirst: jest.fn(),
				deleteMany: jest.fn(),
				create: jest.fn(),
			},
		} as any;
		repo = new RefreshTokenRepository(prisma);
	});

	it('should be defined', () => {
		expect(repo).toBeDefined();
	});

	it('should call findFirst', async () => {
		await repo.findFirst({ where: {} });
		expect(prisma.refreshToken.findFirst as jest.Mock).toHaveBeenCalled();
	});

	it('should call deleteMany', async () => {
		await repo.deleteMany({ where: {} });
		expect(prisma.refreshToken.deleteMany as jest.Mock).toHaveBeenCalled();
	});

	it('should call create', async () => {
		await repo.create({ token: 't', expiresAt: new Date(), user: { connect: { id: '1' } } });
		expect(prisma.refreshToken.create as jest.Mock).toHaveBeenCalled();
	});
});
