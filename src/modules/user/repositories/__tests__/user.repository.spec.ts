import { UserRepository } from '../user.repository';
import { PrismaService } from 'src/database/prisma.service';
import { UserFactory } from '../../../../../test/factories/user.factory';

describe('UserRepository', () => {
	let repo: UserRepository;
	let prisma: PrismaService;

	let mockUser: any;

	beforeEach(() => {
		prisma = {
			user: {
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
		} as any;
		repo = new UserRepository(prisma);
		mockUser = UserFactory.create();
	});

	it('should be defined', () => {
		expect(repo).toBeDefined();
	});

	it('should call findUnique', async () => {
		await repo.findUnique({ id: '1' });
		expect(prisma.user.findUnique).toBeCalled();
	});

	it('should call create', async () => {
		await repo.create({ email: 'a', name: 'b', provider: 'google', providerId: 'pid' });
		expect(prisma.user.create).toBeCalled();
	});

	it('should call update', async () => {
		await repo.update('1', { email: 'a' });
		expect(prisma.user.update).toBeCalled();
	});
});
