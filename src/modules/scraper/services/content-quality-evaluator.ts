import { Injectable } from '@nestjs/common';

export interface ContentQualityMetrics {
	characterCount: number;
	paragraphCount: number;
	linkDensity: number;
	readabilityScore: number;
	isProbablyReadable: boolean;
}

export interface ContentQualityOptions {
	charThreshold?: number;
	minContentLength?: number;
	minScore?: number;
	minParagraphs?: number;
	maxLinkDensity?: number;
}

const DEFAULT_OPTIONS: Required<ContentQualityOptions> = {
	charThreshold: 500,
	minContentLength: 140,
	minScore: 20,
	minParagraphs: 3,
	maxLinkDensity: 0.2,
};

@Injectable()
export class ContentQualityEvaluator {
	evaluate(content: string, html: string, options: ContentQualityOptions = {}): ContentQualityMetrics {
		const opts = { ...DEFAULT_OPTIONS, ...options };
		const characterCount = content.length;
		const paragraphCount = (content.match(/<p[\s>]/g) || []).length;
		const linkCount = (html.match(/<a[\s>]/g) || []).length;
		const textLength = content.replace(/<[^>]+>/g, '').length;
		const linkDensity = linkCount > 0 ? linkCount / Math.max(1, paragraphCount) : 0;
		// Readability 점수는 외부에서 주입하거나, 간단히 텍스트 길이 기반으로 대체
		const readabilityScore = Math.round(textLength / 20); // 임시: 20자당 1점
		const isProbablyReadable =
			characterCount >= opts.charThreshold &&
			textLength >= opts.minContentLength &&
			readabilityScore >= opts.minScore &&
			paragraphCount >= opts.minParagraphs &&
			linkDensity <= opts.maxLinkDensity;
		return {
			characterCount,
			paragraphCount,
			linkDensity,
			readabilityScore,
			isProbablyReadable,
		};
	}

	shouldUsePuppeteer(metrics: ContentQualityMetrics, options: ContentQualityOptions = {}): boolean {
		const opts = { ...DEFAULT_OPTIONS, ...options };
		return (
			metrics.characterCount < opts.charThreshold ||
			metrics.readabilityScore < opts.minScore ||
			metrics.paragraphCount < opts.minParagraphs ||
			metrics.linkDensity > opts.maxLinkDensity
		);
	}
}
