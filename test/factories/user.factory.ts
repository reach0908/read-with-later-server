import { User } from '@prisma/client';
import { faker } from '@faker-js/faker';

export class UserFactory {
	static create(overrides: Partial<User> = {}): User {
		return {
			id: faker.string.uuid(),
			email: faker.internet.email(),
			name: faker.person.fullName(),
			provider: 'google',
			providerId: faker.string.alphanumeric(10),
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		};
	}

	static createMany(count: number, overrides: Partial<User> = {}): User[] {
		return Array.from({ length: count }, () => this.create(overrides));
	}
}
