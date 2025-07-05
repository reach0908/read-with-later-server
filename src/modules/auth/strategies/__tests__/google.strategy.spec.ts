import { GoogleStrategy } from '../google.strategy';
import { OAuthService } from '../../services/oauth.service';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';
import { GoogleProfile } from 'src/types';

describe('GoogleStrategy', () => {
	let strategy: GoogleStrategy;
	let oauthService: jest.Mocked<OAuthService>;
	let config: ConfigType<typeof authConfig>;

	beforeEach(() => {
		oauthService = {
			handleGoogleLogin: jest.fn(),
		} as unknown as jest.Mocked<OAuthService>;

		config = {
			GOOGLE_CLIENT_ID: 'id',
			GOOGLE_CLIENT_SECRET: 'secret',
			GOOGLE_CALLBACK_URL: 'url',
			JWT_SECRET: 'secret',
			JWT_REFRESH_EXPIRES_IN: '7d',
			JWT_ACCESS_EXPIRES_IN: '15m',
		} as unknown as ConfigType<typeof authConfig>;

		strategy = new GoogleStrategy(config, oauthService);
	});

	it('should be defined', () => {
		expect(strategy).toBeDefined();
	});

	it('should throw if user not found', async () => {
		(oauthService.handleGoogleLogin as jest.Mock).mockResolvedValue(null);
		await expect(strategy.validate('a', 'b', {} as unknown as GoogleProfile)).rejects.toThrow();
	});
});
