import { User } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserInput {
	@ApiProperty({ description: 'User name', example: 'John Doe' })
	@IsOptional()
	@IsString({ message: 'Name must be a string' })
	name?: User['name'];
}
