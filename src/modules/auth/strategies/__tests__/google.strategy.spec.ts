import { GoogleStrategy } from '../google.strategy';
import { OAuthService } from '../../services/oauth.service';

describe('GoogleStrategy', () => {
	let strategy: GoogleStrategy;
	let oauthService: OAuthService;
	let config: any;

	beforeEach(() => {
		oauthService = { handleGoogleLogin: jest.fn() } as any;
		config = {
			GOOGLE_CLIENT_ID: 'id',
			GOOGLE_CLIENT_SECRET: 'secret',
			GOOGLE_CALLBACK_URL: 'url',
		};
		strategy = new GoogleStrategy(config, oauthService);
	});

	it('should be defined', () => {
		expect(strategy).toBeDefined();
	});

	it('should throw if user not found', async () => {
		(oauthService.handleGoogleLogin as jest.Mock).mockResolvedValue(null);
		await expect(strategy.validate('a', 'b', {} as any)).rejects.toThrow();
	});
});
