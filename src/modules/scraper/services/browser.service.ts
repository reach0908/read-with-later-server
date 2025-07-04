import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer-extra';
import { Browser } from 'puppeteer-core';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

@Injectable()
export class BrowserService implements OnApplicationShutdown {
	private readonly logger = new Logger(BrowserService.name);
	private browser: Browser | null = null;

	constructor(private readonly configService: ConfigService) {
		// 플러그인은 Chrome 전용이므로 생성자에서 한 번만 등록
		puppeteer.use(StealthPlugin());
		puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
	}

	/**
	 * Puppeteer(Chrome) 브라우저 싱글턴을 반환합니다.
	 */
	async getBrowser(): Promise<Browser> {
		if (this.browser) {
			return this.browser;
		}

		const executablePath = this.configService.get<string>('app.BROWSER_PATH');

		this.logger.log('Starting Puppeteer (Chrome) browser...');

		this.browser = (await puppeteer.launch({
			args: [
				'--autoplay-policy=user-gesture-required',
				'--disable-component-update',
				'--disable-domain-reliability',
				'--disable-print-preview',
				'--disable-setuid-sandbox',
				'--disable-speech-api',
				'--enable-features=SharedArrayBuffer',
				'--hide-scrollbars',
				'--mute-audio',
				'--no-default-browser-check',
				'--no-pings',
				'--no-sandbox',
				'--no-zygote',
				'--disable-extensions',
				'--disable-dev-shm-usage',
				'--no-first-run',
				'--disable-background-networking',
				'--disable-gpu',
				'--disable-software-rasterizer',
			],
			defaultViewport: {
				deviceScaleFactor: 1,
				hasTouch: false,
				height: 1080,
				isLandscape: true,
				isMobile: false,
				width: 1920,
			},
			executablePath,
			headless: true,
			timeout: 30_000,
		})) as unknown as Browser;

		const version = await this.browser.version();
		this.logger.log(`Browser started: ${version}`);

		// 비정상 종료 시 자동 재연결
		this.browser.on('disconnected', () => {
			void this.handleDisconnection();
		});

		return this.browser;
	}

	/**
	 * 브라우저가 끊어졌을 때 재연결을 시도합니다.
	 */
	private async handleDisconnection(): Promise<void> {
		this.logger.warn('Browser disconnected, reconnecting...');
		this.browser = null;
		await this.getBrowser();
	}

	/**
	 * Nest 애플리케이션 종료 훅
	 */
	async onApplicationShutdown(): Promise<void> {
		await this.closeBrowser();
	}

	/**
	 * 브라우저를 안전하게 종료합니다.
	 */
	async closeBrowser(): Promise<void> {
		if (!this.browser) {
			this.logger.log('No browser instance to close');
			return;
		}

		this.logger.log('Closing browser...');
		try {
			await this.browser.close();
			this.logger.log('Browser closed successfully');
		} catch (error) {
			this.logger.error('Error closing browser', error as Error);
		} finally {
			this.browser = null;
		}
	}
}
