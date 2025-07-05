import { Injectable, Logger } from '@nestjs/common';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * Social media platform transformations.
 * Each platform has specific URL patterns and optimal access methods.
 */
const SOCIAL_MEDIA_TRANSFORMATIONS: Record<string, (url: URL) => URL> = {
	'instagram.com': (url) => {
		// Instagram: Use bibliogram or other privacy-friendly proxies
		// For posts, stories, and profiles
		if (url.pathname.includes('/p/') || url.pathname.includes('/reel/') || url.pathname.includes('/tv/')) {
			// For specific posts, use a proxy service
			return new URL(`https://bibliogram.art${url.pathname}`);
		}
		// For profiles, keep original but mark for special handling
		return url;
	},
	'tiktok.com': (url) => {
		// TikTok: Use mobile web version for better content extraction
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.tiktok.com';
		return newUrl;
	},
	'facebook.com': (url) => {
		// Facebook: Use mobile version for simpler layout
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.facebook.com';
		return newUrl;
	},
	'fb.com': (url) => {
		// Facebook short URLs: Convert to mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.facebook.com';
		return newUrl;
	},
	'twitter.com': (url) => {
		// Twitter: Use Nitter (privacy-friendly Twitter frontend)
		const newUrl = new URL(url.href);
		newUrl.hostname = 'nitter.net';
		return newUrl;
	},
	'x.com': (url) => {
		// X (formerly Twitter): Use Nitter
		const newUrl = new URL(url.href);
		newUrl.hostname = 'nitter.net';
		return newUrl;
	},
	'linkedin.com': (url) => {
		// LinkedIn: Keep original but add parameters to avoid login prompts
		const newUrl = new URL(url.href);
		// Remove tracking parameters and add mobile indicator
		newUrl.searchParams.delete('trk');
		newUrl.searchParams.delete('trkInfo');
		newUrl.searchParams.set('lipi', 'urn:li:page:d_flagship3_profile_view_base');
		return newUrl;
	},
	'pinterest.com': (url) => {
		// Pinterest: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.pinterest.com';
		return newUrl;
	},
	'pinterest.co.uk': (url) => {
		// Pinterest UK: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.pinterest.co.uk';
		return newUrl;
	},
	'snapchat.com': (url) => {
		// Snapchat: For stories and profiles, keep original
		// Most Snapchat content requires the app, but some web content exists
		return url;
	},
	'discord.com': (url) => {
		// Discord: For invite links and server info
		if (url.pathname.includes('/invite/')) {
			// Keep invite links as-is
			return url;
		}
		// For other Discord links, they typically require the app
		return url;
	},
	'telegram.org': (url) => {
		// Telegram: Convert to web version when possible
		if (url.pathname.includes('/s/')) {
			// Channel/chat links - use web version
			const newUrl = new URL(url.href);
			newUrl.hostname = 't.me';
			return newUrl;
		}
		return url;
	},
	't.me': (url) => {
		// Telegram short links: Keep as-is, they're already optimized
		return url;
	},
	'mastodon.social': (url) => {
		// Mastodon: Keep original, it's already web-friendly
		return url;
	},
	'mastodon.world': (url) => {
		// Mastodon instance: Keep original
		return url;
	},
	'threads.net': (url) => {
		// Meta Threads: Keep original but note it might require login
		return url;
	},
	'bluesky.app': (url) => {
		// Bluesky: Keep original, it's web-friendly
		return url;
	},
	'vk.com': (url) => {
		// VKontakte: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.vk.com';
		return newUrl;
	},
	'weibo.com': (url) => {
		// Weibo: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.weibo.com';
		return newUrl;
	},
};

/**
 * A content handler specifically for social media platforms.
 * This handler detects social media URLs and transforms them to more
 * scraping-friendly versions when possible.
 */
@Injectable()
export class SocialMediaHandler implements IContentHandler {
	private readonly logger = new Logger(SocialMediaHandler.name);

	/**
	 * Checks if the URL is from a supported social media platform.
	 * @param url - The URL to check.
	 * @returns `true` if the URL is from a supported social media platform.
	 */
	public canHandle(url: URL): boolean {
		return Object.keys(SOCIAL_MEDIA_TRANSFORMATIONS).some((domain) => url.hostname.endsWith(domain));
	}

	/**
	 * Processes social media URLs by transforming them to more accessible versions.
	 * @param url - The social media URL to handle.
	 * @returns A `PreHandleResult` with the transformed URL, or `null` on failure.
	 */
	public handle(url: URL): Promise<PreHandleResult | null> {
		const domain = Object.keys(SOCIAL_MEDIA_TRANSFORMATIONS).find((d) => url.hostname.endsWith(d));

		if (!domain) {
			return Promise.resolve(null);
		}

		try {
			const transform = SOCIAL_MEDIA_TRANSFORMATIONS[domain];
			const newUrl = transform(url);

			// Extract potential title from URL
			let title: string | undefined;
			const platform = this.getPlatformName(domain);

			if (url.pathname.includes('/p/') || url.pathname.includes('/post/')) {
				title = `${platform} Post`;
			} else if (url.pathname.includes('/reel/') || url.pathname.includes('/video/')) {
				title = `${platform} Video`;
			} else if (url.pathname.includes('/story/') || url.pathname.includes('/stories/')) {
				title = `${platform} Story`;
			} else if (url.pathname.length > 1) {
				// Try to extract username or page name
				const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
				if (pathParts.length > 0) {
					const identifier = pathParts[0];
					title = `${platform} - ${identifier}`;
				}
			}

			return Promise.resolve({
				url: newUrl.href,
				title,
				contentType: 'text/html',
			});
		} catch (error) {
			this.logger.warn(`SocialMediaHandler failed for ${url.href}: ${(error as Error).message}`);
			return Promise.resolve(null);
		}
	}

	/**
	 * Gets a human-readable platform name from domain.
	 * @param domain - The domain name.
	 * @returns The platform name.
	 */
	private getPlatformName(domain: string): string {
		const platformNames: Record<string, string> = {
			'instagram.com': 'Instagram',
			'tiktok.com': 'TikTok',
			'facebook.com': 'Facebook',
			'fb.com': 'Facebook',
			'twitter.com': 'Twitter',
			'x.com': 'X',
			'linkedin.com': 'LinkedIn',
			'pinterest.com': 'Pinterest',
			'pinterest.co.uk': 'Pinterest',
			'snapchat.com': 'Snapchat',
			'discord.com': 'Discord',
			'telegram.org': 'Telegram',
			't.me': 'Telegram',
			'mastodon.social': 'Mastodon',
			'mastodon.world': 'Mastodon',
			'threads.net': 'Threads',
			'bluesky.app': 'Bluesky',
			'vk.com': 'VK',
			'weibo.com': 'Weibo',
		};

		return platformNames[domain] || domain;
	}
}
