import { BadRequestException } from '@nestjs/common';

/**
 * Thrown when the provided URL fails validation checks.
 */
export class InvalidUrlException extends BadRequestException {
	constructor(reason: string) {
		super(`Invalid URL: ${reason}`);
	}
}
