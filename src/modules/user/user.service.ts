import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserInput } from 'src/modules/user/dto/create-user.input';
import { UpdateUserInput } from 'src/modules/user/dto/update-user.input';
import { UserRepository } from 'src/modules/user/repositories/user.repository';

@Injectable()
export class UserService {
	constructor(private readonly userRepository: UserRepository) {}

	async getUserByEmail(email: string) {
		return this.userRepository.findUnique({ email });
	}

	async getUserById(id: string) {
		return this.userRepository.findUnique({ id });
	}

	async createUser(createUserInput: CreateUserInput) {
		return this.userRepository.create(createUserInput);
	}

	async updateUser(id: string, updateUserInput: UpdateUserInput) {
		if (Object.keys(updateUserInput).length === 0) {
			throw new BadRequestException('No fields to update');
		}

		const user = await this.getUserById(id);

		if (!user) {
			throw new NotFoundException('User not found');
		}
		return this.userRepository.update(id, updateUserInput);
	}
}
