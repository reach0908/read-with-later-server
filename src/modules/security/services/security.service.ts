import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UnsafeUrlException } from '../exceptions/unsafe-url.exception';

interface SafeBrowsingThreatMatch {
	threatType: string;
	platformType: string;
	threat: {
		url: string;
	};
}

@Injectable()
export class SecurityService {
	private readonly logger = new Logger(SecurityService.name);
	private readonly apiKey: string;
	private readonly apiUrl: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly httpService: HttpService,
	) {
		this.apiKey = this.configService.get<string>('GOOGLE_SAFE_BROWSING_API_KEY', '');
		this.apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${this.apiKey}`;

		if (!this.apiKey) {
			this.logger.warn('Google Safe Browsing API key is not configured. URL safety checks will be skipped.');
		}
	}

	/**
	 * Checks if a URL is flagged as unsafe by Google Safe Browsing API.
	 * @param url The URL to check.
	 * @throws {UnsafeUrlException} If the URL is found to be unsafe.
	 */
	async checkUrlSafety(url: string): Promise<void> {
		if (!this.apiKey) {
			return; // API 키가 없으면 검사 생략
		}

		try {
			const requestBody = {
				client: {
					clientId: 'read-with-later-server',
					clientVersion: '1.0.0',
				},
				threatInfo: {
					threatTypes: [
						'MALWARE',
						'SOCIAL_ENGINEERING',
						'UNWANTED_SOFTWARE',
						'POTENTIALLY_HARMFUL_APPLICATION',
					],
					platformTypes: ['ANY_PLATFORM'],
					threatEntries: [{ url }],
				},
			};

			const response = await firstValueFrom(
				this.httpService.post<{ matches?: SafeBrowsingThreatMatch[] }>(this.apiUrl, requestBody),
			);

			if (response.data.matches && response.data.matches.length > 0) {
				const threats = response.data.matches.map((match) => match.threatType).join(', ');
				this.logger.warn(`Unsafe URL detected: ${url} - Threats: [${threats}]`);
				throw new UnsafeUrlException(`URL is flagged as unsafe: ${threats}`);
			}
		} catch (error) {
			if (error instanceof UnsafeUrlException) {
				throw error;
			}
			this.logger.error(`Error checking URL safety for ${url}: ${error}`);
			// API 오류가 발생해도 서비스를 중단시키지 않음 (fail-open)
		}
	}
}
