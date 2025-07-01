import { User } from '@prisma/client';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserInput {
	@IsEmail({}, { message: 'Invalid email format' })
	@IsNotEmpty({ message: 'Email is required' })
	email: User['email'];

	@IsString({ message: 'Name must be a string' })
	@IsNotEmpty({ message: 'Name is required' })
	name: User['name'];

	@IsString({ message: 'Provider must be a string' })
	@IsNotEmpty({ message: 'Provider is required' })
	provider: User['provider'];

	@IsString({ message: 'Provider ID must be a string' })
	@IsNotEmpty({ message: 'Provider ID is required' })
	providerId: User['providerId'];
}
