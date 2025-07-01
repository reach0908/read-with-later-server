import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { UserService } from 'src/modules/user/user.service';
import { User } from '@prisma/client';

describe('AuthService', () => {
	let service: AuthService;
	let userService: { getUserByEmail: jest.Mock };

	const mockUser: User = {
		id: '1',
		email: 'test@test.com',
		name: '테스트',
		provider: 'google',
		providerId: 'gid',
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(async () => {
		userService = {
			getUserByEmail: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [AuthService, { provide: UserService, useValue: userService }],
		}).compile();

		service = module.get<AuthService>(AuthService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('validateUser', () => {
		it('유효한 이메일로 유저를 반환한다', async () => {
			userService.getUserByEmail.mockResolvedValue(mockUser);

			const result = await service.validateUser(mockUser.email);

			expect(userService.getUserByEmail).toHaveBeenCalledWith(mockUser.email);
			expect(result).toEqual(mockUser);
		});

		it('존재하지 않는 유저의 경우 NotFoundException을 던진다', async () => {
			userService.getUserByEmail.mockResolvedValue(null);

			await expect(service.validateUser('none@test.com')).rejects.toThrow(NotFoundException);
			await expect(service.validateUser('none@test.com')).rejects.toThrow('Invalid credentials');
		});

		it('UserService에서 에러 발생 시 예외를 전파한다', async () => {
			const error = new Error('Database error');
			userService.getUserByEmail.mockRejectedValue(error);

			await expect(service.validateUser('test@test.com')).rejects.toThrow('Database error');
		});
	});
});
