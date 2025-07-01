import { User } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserInput {
	@ApiProperty({ description: 'User email', example: 'test@example.com' })
	@IsEmail({}, { message: 'Invalid email format' })
	@IsNotEmpty({ message: 'Email is required' })
	email: User['email'];

	@ApiProperty({ description: 'User name', example: 'John Doe' })
	@IsString({ message: 'Name must be a string' })
	@IsNotEmpty({ message: 'Name is required' })
	name: User['name'];

	@ApiProperty({ description: 'User provider', example: 'google' })
	@IsString({ message: 'Provider must be a string' })
	@IsNotEmpty({ message: 'Provider is required' })
	provider: User['provider'];

	@ApiProperty({ description: 'User provider ID', example: '1234567890' })
	@IsString({ message: 'Provider ID must be a string' })
	@IsNotEmpty({ message: 'Provider ID is required' })
	providerId: User['providerId'];
}
