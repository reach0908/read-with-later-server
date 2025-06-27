import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/modules/user/user.service';
import { PrismaService } from 'src/database/prisma.service';
import { CreateUserInput } from 'src/modules/user/dto/create-user.input';
import { User } from '@prisma/client';

describe('UserService', () => {
	let service: UserService;
	let prismaService: {
		user: {
			findUnique: jest.Mock;
			create: jest.Mock;
		};
	};

	const mockUser: User = {
		id: '1',
		email: 'test@test.com',
		name: '테스트 유저',
		provider: 'google',
		providerId: 'google-123',
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	};

	beforeEach(async () => {
		prismaService = {
			user: {
				findUnique: jest.fn(),
				create: jest.fn(),
			},
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [UserService, { provide: PrismaService, useValue: prismaService }],
		}).compile();

		service = module.get<UserService>(UserService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('findByEmail', () => {
		it('이메일로 유저를 성공적으로 찾는다', async () => {
			const email = 'test@test.com';
			prismaService.user.findUnique.mockResolvedValue(mockUser);

			const result = await service.findByEmail(email);

			expect(prismaService.user.findUnique).toHaveBeenCalledWith({
				where: { email },
			});
			expect(result).toEqual(mockUser);
		});

		it('존재하지 않는 이메일의 경우 null을 반환한다', async () => {
			const email = 'notfound@test.com';
			prismaService.user.findUnique.mockResolvedValue(null);

			const result = await service.findByEmail(email);

			expect(prismaService.user.findUnique).toHaveBeenCalledWith({
				where: { email },
			});
			expect(result).toBeNull();
		});

		it('데이터베이스 에러 발생 시 예외를 전파한다', async () => {
			const email = 'test@test.com';
			const error = new Error('Database connection error');
			prismaService.user.findUnique.mockRejectedValue(error);

			await expect(service.findByEmail(email)).rejects.toThrow('Database connection error');
		});
	});

	describe('createUser', () => {
		it('새 유저를 성공적으로 생성한다', async () => {
			const createUserInput: CreateUserInput = {
				email: 'newuser@test.com',
				name: '새 유저',
				provider: 'google',
				providerId: 'google-456',
			};

			const createdUser: User = {
				...createUserInput,
				id: '2',
				createdAt: new Date('2024-01-02'),
				updatedAt: new Date('2024-01-02'),
			};

			prismaService.user.create.mockResolvedValue(createdUser);

			const result = await service.createUser(createUserInput);

			expect(prismaService.user.create).toHaveBeenCalledWith({
				data: createUserInput,
			});
			expect(result).toEqual(createdUser);
		});

		it('필수 필드만으로 유저를 생성한다', async () => {
			const createUserInput: CreateUserInput = {
				email: 'minimal@test.com',
				name: null,
				provider: 'github',
				providerId: 'github-789',
			};

			const createdUser: User = {
				...createUserInput,
				id: '3',
				createdAt: new Date('2024-01-03'),
				updatedAt: new Date('2024-01-03'),
			};

			prismaService.user.create.mockResolvedValue(createdUser);

			const result = await service.createUser(createUserInput);

			expect(prismaService.user.create).toHaveBeenCalledWith({
				data: createUserInput,
			});
			expect(result).toEqual(createdUser);
		});

		it('데이터베이스 에러 발생 시 예외를 전파한다', async () => {
			const createUserInput: CreateUserInput = {
				email: 'error@test.com',
				name: '에러 유저',
				provider: 'google',
				providerId: 'google-error',
			};

			const error = new Error('Unique constraint violation');
			prismaService.user.create.mockRejectedValue(error);

			await expect(service.createUser(createUserInput)).rejects.toThrow('Unique constraint violation');
		});

		it('중복 이메일로 유저 생성 시 Prisma 에러를 전파한다', async () => {
			const createUserInput: CreateUserInput = {
				email: 'duplicate@test.com',
				name: '중복 유저',
				provider: 'google',
				providerId: 'google-duplicate',
			};

			const prismaError = {
				code: 'P2002',
				message: 'Unique constraint failed on the fields: (`email`)',
				meta: { target: ['email'] },
			};

			prismaService.user.create.mockRejectedValue(prismaError);

			await expect(service.createUser(createUserInput)).rejects.toEqual(prismaError);
		});
	});
});
