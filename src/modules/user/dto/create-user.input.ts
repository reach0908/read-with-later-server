import { User } from '@prisma/client';

export class CreateUserInput {
	email: User['email'];
	name: User['name'];
	provider: User['provider'];
	providerId: User['providerId'];
}
