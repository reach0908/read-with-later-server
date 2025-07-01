import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OAuthService } from 'src/modules/auth/services/oauth.service';
import { UserService } from 'src/modules/user/user.service';
import { User } from '@prisma/client';
import { GoogleProfile } from 'src/types';
import { UserFactory } from 'test/factories/user.factory';

describe('OAuthService', () => {
	let service: OAuthService;
	let userService: { getUserByEmail: jest.Mock; createUser: jest.Mock };

	let mockUser: User;

	const mockGoogleProfile: GoogleProfile = {
		emails: [{ value: 'test@test.com' }],
		displayName: '테스트',
		id: 'gid',
		provider: 'google',
	} as GoogleProfile;

	beforeEach(async () => {
		userService = {
			getUserByEmail: jest.fn(),
			createUser: jest.fn(),
		};

		mockUser = UserFactory.create();

		const module: TestingModule = await Test.createTestingModule({
			providers: [OAuthService, { provide: UserService, useValue: userService }],
		}).compile();

		service = module.get<OAuthService>(OAuthService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('OAuthService 인스턴스가 정의되어야 한다', () => {
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
				provider: 'google',
			} as GoogleProfile;
			const newUser: User = UserFactory.create({
				email: 'new@test.com',
				name: '신규유저',
				provider: 'google',
				providerId: 'new-gid',
			});
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

		it('Google 프로필에 emails가 없거나 비어있으면 BadRequestException을 던진다', async () => {
			const profileWithoutEmail = { provider: 'google' } as GoogleProfile;
			const profileWithEmptyEmails = {
				emails: [],
				displayName: '테스트',
				id: 'gid',
				provider: 'google',
			} as GoogleProfile;
			await expect(service.handleGoogleLogin(profileWithoutEmail)).rejects.toThrow(BadRequestException);
			await expect(service.handleGoogleLogin(profileWithEmptyEmails)).rejects.toThrow(BadRequestException);
			await expect(service.handleGoogleLogin(profileWithoutEmail)).rejects.toThrow(
				'Google profile does not contain email',
			);
			await expect(service.handleGoogleLogin(profileWithEmptyEmails)).rejects.toThrow(
				'Google profile does not contain email',
			);
		});

		it('Google 프로필의 emails[0].value가 없으면 BadRequestException을 던진다', async () => {
			const profileWithNoValue = {
				emails: [{}],
				displayName: '테스트',
				id: 'gid',
				provider: 'google',
			} as GoogleProfile;
			await expect(service.handleGoogleLogin(profileWithNoValue)).rejects.toThrow(BadRequestException);
			await expect(service.handleGoogleLogin(profileWithNoValue)).rejects.toThrow(
				'Google profile does not contain email',
			);
		});

		it('UserService에서 에러 발생 시 예외를 그대로 전파한다', async () => {
			const error = new Error('DB 에러');
			userService.getUserByEmail.mockRejectedValue(error);
			await expect(service.handleGoogleLogin(mockGoogleProfile)).rejects.toThrow('DB 에러');
		});

		it('유저 생성 시 에러 발생하면 예외를 그대로 전파한다', async () => {
			const error = new Error('유저 생성 실패');
			userService.getUserByEmail.mockResolvedValue(null);
			userService.createUser.mockRejectedValue(error);
			await expect(service.handleGoogleLogin(mockGoogleProfile)).rejects.toThrow('유저 생성 실패');
		});

		it('displayName이 없으면 name은 null로 저장된다', async () => {
			const profile: GoogleProfile = {
				emails: [{ value: 'no-name@test.com' }],
				id: 'gid',
				provider: 'google',
			} as GoogleProfile;
			userService.getUserByEmail.mockResolvedValue(null);
			userService.createUser.mockResolvedValue({ ...mockUser, email: 'no-name@test.com', name: null });
			const result = await service.handleGoogleLogin(profile);
			expect(userService.createUser).toHaveBeenCalledWith({
				email: 'no-name@test.com',
				name: null,
				provider: 'google',
				providerId: 'gid',
			});
			expect(result.name).toBeNull();
		});
	});
});
