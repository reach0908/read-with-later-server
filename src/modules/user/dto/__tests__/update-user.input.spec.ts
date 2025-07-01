import { validate } from 'class-validator';
import { UpdateUserInput } from '../update-user.input';

describe('UpdateUserInput', () => {
	it('should pass with valid name', async () => {
		const input = new UpdateUserInput();
		input.name = 'John';
		const errors = await validate(input);
		expect(errors.length).toBe(0);
	});

	it('should pass if name is undefined (optional)', async () => {
		const input = new UpdateUserInput();
		const errors = await validate(input);
		expect(errors.length).toBe(0);
	});
});
