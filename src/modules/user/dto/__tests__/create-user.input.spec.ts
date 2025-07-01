import { validate } from 'class-validator';
import { CreateUserInput } from '../create-user.input';

describe('CreateUserInput', () => {
	it('should fail if required fields are missing', async () => {
		const input = new CreateUserInput();
		const errors = await validate(input);
		expect(errors.length).toBeGreaterThan(0);
	});

	it('should pass with valid fields', async () => {
		const input = new CreateUserInput();
		input.email = 'test@example.com';
		input.name = 'John';
		input.provider = 'google';
		input.providerId = '123';
		const errors = await validate(input);
		expect(errors.length).toBe(0);
	});
});
