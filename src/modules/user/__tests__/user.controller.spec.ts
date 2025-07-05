import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { UpdateUserInput } from '../dto/update-user.input';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserFactory } from '../../../../test/factories/user.factory';
import { AuthRequest } from 'src/types';

// JwtAuthGuard를 완전히 무시하는 mock guard
class MockJwtAuthGuard {
	canActivate() {
		return true;
	}
}

describe('UserController', () => {
	let controller: UserController;
	let userService: {
		getUserById: jest.Mock;
		updateUser: jest.Mock;
	};

	let mockUser: User;

	beforeEach(async () => {
		userService = {
			getUserById: jest.fn(),
			updateUser: jest.fn(),
		};

		mockUser = UserFactory.create();

		const module: TestingModule = await Test.createTestingModule({
			controllers: [UserController],
			providers: [{ provide: UserService, useValue: userService }],
		})
			.overrideGuard(JwtAuthGuard)
			.useClass(MockJwtAuthGuard)
			.compile();

		controller = module.get<UserController>(UserController);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getUser', () => {
		it('정상적으로 유저 정보를 반환한다', async () => {
			userService.getUserById.mockResolvedValue(mockUser);
			const req = { user: { id: mockUser.id } } as unknown as AuthRequest;
			const result = await controller.getUser(req);
			expect(userService.getUserById).toHaveBeenCalledWith(mockUser.id);
			expect(result).toEqual(mockUser);
		});

		it('유저가 존재하지 않으면 null을 반환한다', async () => {
			userService.getUserById.mockResolvedValue(null);
			const req = { user: { id: 'not-exist' } } as unknown as AuthRequest;
			const result = await controller.getUser(req);
			expect(userService.getUserById).toHaveBeenCalledWith('not-exist');
			expect(result).toBeNull();
		});

		it('userService.getUserById에서 에러가 발생하면 예외를 그대로 전파한다', async () => {
			userService.getUserById.mockRejectedValue(new Error('DB 에러'));
			const req = { user: { id: 'err' } } as unknown as AuthRequest;
			await expect(controller.getUser(req)).rejects.toThrow('DB 에러');
		});
	});

	describe('updateUser', () => {
		it('정상적으로 유저 정보를 업데이트한다', async () => {
			const updateUserInput: UpdateUserInput = { name: '새 이름' };
			const updatedUser = { ...mockUser, name: '새 이름' };
			userService.updateUser.mockResolvedValue(updatedUser);
			const req = { user: { id: mockUser.id } } as unknown as AuthRequest;
			const result = await controller.updateUser(req, updateUserInput);
			expect(userService.updateUser).toHaveBeenCalledWith(mockUser.id, updateUserInput);
			expect(result).toEqual(updatedUser);
		});

		it('빈 객체가 들어오면 BadRequestException을 던진다', async () => {
			userService.updateUser.mockRejectedValue(new BadRequestException('No fields to update'));
			const req = { user: { id: mockUser.id } } as unknown as AuthRequest;
			await expect(controller.updateUser(req, {})).rejects.toThrow(BadRequestException);
			expect(userService.updateUser).toHaveBeenCalledWith(mockUser.id, {});
		});

		it('존재하지 않는 유저 ID로 업데이트 시 NotFoundException을 던진다', async () => {
			userService.updateUser.mockRejectedValue(new NotFoundException('User not found'));
			const req = { user: { id: 'not-exist' } } as unknown as AuthRequest;
			await expect(controller.updateUser(req, { name: '이름' })).rejects.toThrow(NotFoundException);
			expect(userService.updateUser).toHaveBeenCalledWith('not-exist', { name: '이름' });
		});

		it('userService.updateUser에서 에러가 발생하면 예외를 그대로 전파한다', async () => {
			userService.updateUser.mockRejectedValue(new Error('DB 에러'));
			const req = { user: { id: 'err' } } as unknown as AuthRequest;
			await expect(controller.updateUser(req, { name: '이름' })).rejects.toThrow('DB 에러');
		});
	});
});
