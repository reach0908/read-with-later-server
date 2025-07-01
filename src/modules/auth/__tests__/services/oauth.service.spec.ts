import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OAuthService } from 'src/modules/auth/services/oauth.service';
import { UserService } from 'src/modules/user/user.service';
import { User } from '@prisma/client';
import { GoogleProfile } from 'src/types';

describe('OAuthService', () => {
	let service: OAuthService;
	let userService: { getUserByEmail: jest.Mock; createUser: jest.Mock };

	const mockUser: User = {
		id: '1',
		email: 'test@test.com',
		name: '테스트',
		provider: 'google',
		providerId: 'gid',
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockGoogleProfile: GoogleProfile = {
		emails: [{ value: 'test@test.com' }],
		displayName: '테스트',
		id: 'gid',
	} as GoogleProfile;

	beforeEach(async () => {
		userService = {
			getUserByEmail: jest.fn(),
			createUser: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [OAuthService, { provide: UserService, useValue: userService }],
		}).compile();

		service = module.get<OAuthService>(OAuthService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('handleGoogleLogin', () => {
		it('기존 유저가 있으면 해당 유저를 반환한다', async () => {
			userService.getUserByEmail.mockResolvedValue(mockUser);

			const result = await service.handleGoogleLogin(mockGoogleProfile);

			expect(userService.getUserByEmail).toHaveBeenCalledWith('test@test.com');
			expect(userService.createUser).not.toHaveBeenCalled();
			expect(result).toEqual(mockUser);
		});

		it('새로운 유저인 경우 유저를 생성하고 반환한다', async () => {
			const newUserProfile: GoogleProfile = {
				emails: [{ value: 'new@test.com' }],
				displayName: '신규유저',
				id: 'new-gid',
			} as GoogleProfile;

			const newUser: User = {
				id: '2',
				email: 'new@test.com',
				name: '신규유저',
				provider: 'google',
				providerId: 'new-gid',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			userService.getUserByEmail.mockResolvedValue(null);
			userService.createUser.mockResolvedValue(newUser);

			const result = await service.handleGoogleLogin(newUserProfile);

			expect(userService.getUserByEmail).toHaveBeenCalledWith('new@test.com');
			expect(userService.createUser).toHaveBeenCalledWith({
				email: 'new@test.com',
				name: '신규유저',
				provider: 'google',
				providerId: 'new-gid',
			});
			expect(result).toEqual(newUser);
		});

		it('Google 프로필에 이메일이 없으면 BadRequestException을 던진다', async () => {
			const profileWithoutEmail = {} as GoogleProfile;

			await expect(service.handleGoogleLogin(profileWithoutEmail)).rejects.toThrow(BadRequestException);
			await expect(service.handleGoogleLogin(profileWithoutEmail)).rejects.toThrow(
				'Google profile does not contain email',
			);
		});

		it('Google 프로필의 emails 배열이 비어있으면 BadRequestException을 던진다', async () => {
			const profileWithEmptyEmails = {
				emails: [],
				displayName: '테스트',
				id: 'gid',
			} as unknown as GoogleProfile;

			await expect(service.handleGoogleLogin(profileWithEmptyEmails)).rejects.toThrow(BadRequestException);
			await expect(service.handleGoogleLogin(profileWithEmptyEmails)).rejects.toThrow(
				'Google profile does not contain email',
			);
		});

		it('UserService에서 에러 발생 시 예외를 전파한다', async () => {
			const error = new Error('Database error');
			userService.getUserByEmail.mockRejectedValue(error);

			await expect(service.handleGoogleLogin(mockGoogleProfile)).rejects.toThrow('Database error');
		});

		it('유저 생성 시 에러 발생하면 예외를 전파한다', async () => {
			const error = new Error('Create user failed');
			userService.getUserByEmail.mockResolvedValue(null);
			userService.createUser.mockRejectedValue(error);

			await expect(service.handleGoogleLogin(mockGoogleProfile)).rejects.toThrow('Create user failed');
		});
	});
});
