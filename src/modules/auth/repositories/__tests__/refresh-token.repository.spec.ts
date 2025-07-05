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
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(prisma.refreshToken.findFirst).toHaveBeenCalled();
	});

	it('should call deleteMany', async () => {
		await repo.deleteMany({ where: {} });
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
	});

	it('should call create', async () => {
		await repo.create({ token: 't', expiresAt: new Date(), user: { connect: { id: '1' } } });
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(prisma.refreshToken.create).toHaveBeenCalled();
	});
});
