import { UserRepository } from '../user.repository';
import { PrismaService } from 'src/database/prisma.service';

describe('UserRepository', () => {
	let repo: UserRepository;
	let prisma: PrismaService;

	beforeEach(() => {
		prisma = {
			user: {
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
		} as any;
		repo = new UserRepository(prisma);
	});

	it('should be defined', () => {
		expect(repo).toBeDefined();
	});

	it('should call findUnique', async () => {
		await repo.findUnique({ id: '1' });
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(prisma.user.findUnique).toHaveBeenCalled();
	});

	it('should call create', async () => {
		await repo.create({ email: 'a', name: 'b', provider: 'google', providerId: 'pid' });
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(prisma.user.create).toHaveBeenCalled();
	});

	it('should call update', async () => {
		await repo.update('1', { email: 'a' });
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(prisma.user.update).toHaveBeenCalled();
	});
});
