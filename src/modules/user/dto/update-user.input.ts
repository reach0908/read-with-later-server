import { User } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserInput {
	@IsOptional()
	@IsString({ message: 'Name must be a string' })
	name?: User['name'];
}
