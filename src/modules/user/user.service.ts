import { Injectable } from '@nestjs/common';
import { CreateUserInput } from 'src/modules/user/dto/create-user.input';
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
}
