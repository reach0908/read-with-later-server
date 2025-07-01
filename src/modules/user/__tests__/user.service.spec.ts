import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/modules/user/user.service';
import { User } from '@prisma/client';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { CreateUserInput } from 'src/modules/user/dto/create-user.input';

describe('UserService', () => {
	let service: UserService;
	let userRepository: {
		findUnique: jest.Mock;
		create: jest.Mock;
		update: jest.Mock;
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
		userRepository = {
			findUnique: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [UserService, { provide: UserRepository, useValue: userRepository }],
		}).compile();

		service = module.get<UserService>(UserService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('UserService 인스턴스가 정의되어야 한다', () => {
		expect(service).toBeDefined();
	});

	describe('getUserByEmail', () => {
		it('이메일로 유저를 성공적으로 찾는다', async () => {
			const email = 'test@test.com';
			userRepository.findUnique.mockResolvedValue(mockUser);
			const result = await service.getUserByEmail(email);
			expect(userRepository.findUnique).toHaveBeenCalledWith({ email });
			expect(result).toEqual(mockUser);
		});

		it('존재하지 않는 이메일의 경우 null을 반환한다', async () => {
			const email = 'notfound@test.com';
			userRepository.findUnique.mockResolvedValue(null);
			const result = await service.getUserByEmail(email);
			expect(userRepository.findUnique).toHaveBeenCalledWith({ email });
			expect(result).toBeNull();
		});

		it('데이터베이스 에러 발생 시 예외를 전파한다', async () => {
			const email = 'test@test.com';
			const error = new Error('DB 연결 에러');
			userRepository.findUnique.mockRejectedValue(error);
			await expect(service.getUserByEmail(email)).rejects.toThrow('DB 연결 에러');
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
			userRepository.create.mockResolvedValue(createdUser);
			const result = await service.createUser(createUserInput);
			expect(userRepository.create).toHaveBeenCalledWith(createUserInput);
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
			userRepository.create.mockResolvedValue(createdUser);
			const result = await service.createUser(createUserInput);
			expect(userRepository.create).toHaveBeenCalledWith(createUserInput);
			expect(result).toEqual(createdUser);
		});

		it('데이터베이스 에러 발생 시 예외를 전파한다', async () => {
			const createUserInput: CreateUserInput = {
				email: 'error@test.com',
				name: '에러 유저',
				provider: 'google',
				providerId: 'google-error',
			};
			const error = new Error('DB 에러');
			userRepository.create.mockRejectedValue(error);
			await expect(service.createUser(createUserInput)).rejects.toThrow('DB 에러');
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
			userRepository.create.mockRejectedValue(prismaError);
			await expect(service.createUser(createUserInput)).rejects.toEqual(prismaError);
		});
	});

	describe('updateUser', () => {
		it('유저 정보를 성공적으로 업데이트한다', async () => {
			const userId = '1';
			const updateUserInput = { name: '업데이트된 이름' };
			const updatedUser = { ...mockUser, name: '업데이트된 이름' };
			userRepository.findUnique.mockResolvedValue(mockUser);
			userRepository.update.mockResolvedValue(updatedUser);
			const result = await service.updateUser(userId, updateUserInput);
			expect(userRepository.findUnique).toHaveBeenCalledWith({ id: userId });
			expect(userRepository.update).toHaveBeenCalledWith(userId, updateUserInput);
			expect(result).toEqual(updatedUser);
		});

		it('빈 객체가 들어오면 BadRequestException을 던진다', async () => {
			const userId = '1';
			const updateUserInput = {};
			await expect(service.updateUser(userId, updateUserInput)).rejects.toThrow('No fields to update');
			expect(userRepository.findUnique).not.toHaveBeenCalled();
			expect(userRepository.update).not.toHaveBeenCalled();
		});

		it('모든 값이 undefined인 객체가 들어오면 BadRequestException을 던진다', async () => {
			const userId = '1';
			const updateUserInput = { name: undefined, email: undefined };
			await expect(service.updateUser(userId, updateUserInput)).rejects.toThrow('No fields to update');
			expect(userRepository.findUnique).not.toHaveBeenCalled();
			expect(userRepository.update).not.toHaveBeenCalled();
		});

		it('일부 값만 undefined인 경우 정상적으로 업데이트된다', async () => {
			const userId = '1';
			const updateUserInput = { name: undefined, email: 'new@email.com' };
			const updatedUser = { ...mockUser, email: 'new@email.com' };
			userRepository.findUnique.mockResolvedValue(mockUser);
			userRepository.update.mockResolvedValue(updatedUser);
			const result = await service.updateUser(userId, updateUserInput);
			expect(userRepository.findUnique).toHaveBeenCalledWith({ id: userId });
			expect(userRepository.update).toHaveBeenCalledWith(userId, updateUserInput);
			expect(result).toEqual(updatedUser);
		});

		it('존재하지 않는 유저 ID로 업데이트 시 NotFoundException을 던진다', async () => {
			const userId = '999';
			const updateUserInput = { name: '업데이트된 이름' };
			userRepository.findUnique.mockResolvedValue(null);
			await expect(service.updateUser(userId, updateUserInput)).rejects.toThrow('User not found');
			expect(userRepository.findUnique).toHaveBeenCalledWith({ id: userId });
			expect(userRepository.update).not.toHaveBeenCalled();
		});
	});
});
