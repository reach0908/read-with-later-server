import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { UserService } from 'src/modules/user/user.service';
import { User } from '@prisma/client';
import { UserFactory } from 'test/factories/user.factory';

describe('AuthService', () => {
	let service: AuthService;
	let userService: { getUserByEmail: jest.Mock };

	let mockUser: User;

	beforeEach(async () => {
		userService = {
			getUserByEmail: jest.fn(),
		};

		mockUser = UserFactory.create();

		const module: TestingModule = await Test.createTestingModule({
			providers: [AuthService, { provide: UserService, useValue: userService }],
		}).compile();

		service = module.get<AuthService>(AuthService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('AuthService 인스턴스가 정의되어야 한다', () => {
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

		it('UserService에서 에러 발생 시 예외를 그대로 전파한다', async () => {
			const error = new Error('DB 연결 에러');
			userService.getUserByEmail.mockRejectedValue(error);
			await expect(service.validateUser('test@test.com')).rejects.toThrow('DB 연결 에러');
		});

		it('이메일이 undefined/null이면 NotFoundException을 던진다', async () => {
			userService.getUserByEmail.mockResolvedValue(null);
			await expect(service.validateUser(undefined as any)).rejects.toThrow(NotFoundException);
			await expect(service.validateUser(null as any)).rejects.toThrow(NotFoundException);
		});
	});
});
