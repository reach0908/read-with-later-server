import { Injectable, Logger } from '@nestjs/common';

export interface ContentQualityMetrics {
	characterCount: number;
	paragraphCount: number;
	linkDensity: number;
	readabilityScore: number;
	isProbablyReadable: boolean;
	textLength: number;
	sentenceCount: number;
	wordCount: number;
	averageSentenceLength: number;
	contentStructure: ContentStructure;
}

export interface ContentStructure {
	hasHeadings: boolean;
	hasLists: boolean;
	hasImages: boolean;
	hasCodeBlocks: boolean;
	structureScore: number;
}

export interface ContentQualityOptions {
	charThreshold?: number;
	minContentLength?: number;
	minScore?: number;
	minParagraphs?: number;
	maxLinkDensity?: number;
	siteSpecific?: SiteSpecificOptions;
}

export interface SiteSpecificOptions {
	socialMedia?: boolean;
	newsSite?: boolean;
	blog?: boolean;
	documentation?: boolean;
	shortForm?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<ContentQualityOptions, 'siteSpecific'>> = {
	charThreshold: 150,
	minContentLength: 50,
	minScore: 8,
	minParagraphs: 1,
	maxLinkDensity: 0.5,
};

const SITE_SPECIFIC_OPTIONS: Record<string, Partial<ContentQualityOptions>> = {
	// 소셜 미디어 (짧은 포스트)
	'twitter.com': { charThreshold: 30, minContentLength: 10, minParagraphs: 1, maxLinkDensity: 0.8 },
	'x.com': { charThreshold: 30, minContentLength: 10, minParagraphs: 1, maxLinkDensity: 0.8 },
	'instagram.com': { charThreshold: 30, minContentLength: 10, minParagraphs: 1, maxLinkDensity: 0.8 },
	'facebook.com': { charThreshold: 50, minContentLength: 20, minParagraphs: 1, maxLinkDensity: 0.7 },
	// 뉴스 사이트 (긴 기사)
	'news.naver.com': { charThreshold: 200, minContentLength: 80, minParagraphs: 1, maxLinkDensity: 0.4 },
	'news.daum.net': { charThreshold: 200, minContentLength: 80, minParagraphs: 1, maxLinkDensity: 0.4 },
	'bbc.com': { charThreshold: 200, minContentLength: 80, minParagraphs: 1, maxLinkDensity: 0.4 },
	// 블로그 플랫폼 - 티스토리 기준 완화
	'medium.com': { charThreshold: 100, minContentLength: 40, minParagraphs: 1, maxLinkDensity: 0.5 },
	'tistory.com': { charThreshold: 50, minContentLength: 20, minParagraphs: 1, maxLinkDensity: 0.8, minScore: 5 },
	'brunch.co.kr': { charThreshold: 100, minContentLength: 40, minParagraphs: 1, maxLinkDensity: 0.5 },
	// 개발자 문서
	'github.com': { charThreshold: 50, minContentLength: 20, minParagraphs: 1, maxLinkDensity: 0.7 },
	'stackoverflow.com': { charThreshold: 50, minContentLength: 20, minParagraphs: 1, maxLinkDensity: 0.7 },
	'developer.mozilla.org': { charThreshold: 100, minContentLength: 40, minParagraphs: 1, maxLinkDensity: 0.5 },
	// 뉴스레터
	'substack.com': { charThreshold: 150, minContentLength: 60, minParagraphs: 1, maxLinkDensity: 0.4 },
	'maily.so': { charThreshold: 150, minContentLength: 60, minParagraphs: 1, maxLinkDensity: 0.4 },
	'stibee.com': { charThreshold: 150, minContentLength: 60, minParagraphs: 1, maxLinkDensity: 0.4 },
};

@Injectable()
export class ContentQualityEvaluator {
	private readonly logger = new Logger(ContentQualityEvaluator.name);

	/**
	 * 컨텐츠 품질을 종합적으로 평가합니다.
	 * @param content HTML 컨텐츠
	 * @param html 원본 HTML
	 * @param options 품질 평가 옵션
	 * @param url 평가 대상 URL (사이트별 기준 적용용)
	 * @returns ContentQualityMetrics
	 */
	evaluate(content: string, html: string, options: ContentQualityOptions = {}, url?: string): ContentQualityMetrics {
		// 사이트별 옵션 적용
		const siteSpecificOptions = this.getSiteSpecificOptions(url);
		const opts = { ...DEFAULT_OPTIONS, ...siteSpecificOptions, ...options };

		// 기본 메트릭 계산
		const characterCount = content.length;
		const textLength = this.extractTextLength(content);
		const paragraphCount = this.countParagraphs(content);
		const linkCount = this.countLinks(html);
		const linkDensity = this.calculateLinkDensity(linkCount, paragraphCount);

		// 고급 메트릭 계산
		const sentenceCount = this.countSentences(content);
		const wordCount = this.countWords(content);
		const averageSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

		// 구조 분석
		const contentStructure = this.analyzeContentStructure(content);

		// 개선된 가독성 점수 계산
		const readabilityScore = this.calculateReadabilityScore({
			textLength,
			sentenceCount,
			wordCount,
			averageSentenceLength,
			contentStructure,
		});

		// 품질 판정
		const isProbablyReadable = this.isContentReadable(
			{
				characterCount,
				textLength,
				readabilityScore,
				paragraphCount,
				linkDensity,
				contentStructure,
			},
			opts,
		);

		const metrics: ContentQualityMetrics = {
			characterCount,
			paragraphCount,
			linkDensity,
			readabilityScore,
			isProbablyReadable,
			textLength,
			sentenceCount,
			wordCount,
			averageSentenceLength,
			contentStructure,
		};

		this.logger.debug(`Quality evaluation: ${JSON.stringify(metrics)}`);
		return metrics;
	}

	/**
	 * Puppeteer 사용 여부를 결정합니다.
	 * @param metrics 품질 메트릭
	 * @param options 품질 옵션
	 * @param url 대상 URL
	 * @returns boolean
	 */
	shouldUsePuppeteer(metrics: ContentQualityMetrics, options: ContentQualityOptions = {}, url?: string): boolean {
		const siteSpecificOptions = this.getSiteSpecificOptions(url);
		const opts = { ...DEFAULT_OPTIONS, ...siteSpecificOptions, ...options };

		return (
			metrics.characterCount < opts.charThreshold ||
			metrics.readabilityScore < opts.minScore ||
			metrics.paragraphCount < opts.minParagraphs ||
			metrics.linkDensity > opts.maxLinkDensity ||
			metrics.textLength < opts.minContentLength
		);
	}

	/**
	 * 사이트별 품질 기준을 가져옵니다.
	 * @param url 대상 URL
	 * @returns 사이트별 옵션
	 */
	private getSiteSpecificOptions(url?: string): Partial<ContentQualityOptions> {
		if (!url) return {};

		try {
			const hostname = new URL(url).hostname;
			for (const [domain, options] of Object.entries(SITE_SPECIFIC_OPTIONS)) {
				if (hostname.includes(domain)) {
					this.logger.debug(`Applied site-specific options for ${domain}`);
					return options;
				}
			}
		} catch {
			this.logger.warn(`Failed to parse URL for site-specific options: ${url}`);
		}

		return {};
	}

	/**
	 * 텍스트 길이를 추출합니다 (HTML 태그 제거).
	 * @param content HTML 컨텐츠
	 * @returns 텍스트 길이
	 */
	private extractTextLength(content: string): number {
		return content.replace(/<[^>]+>/g, '').trim().length;
	}

	/**
	 * 단락 수를 계산합니다 (개선된 방식).
	 * @param content HTML 컨텐츠
	 * @returns 단락 수
	 */
	private countParagraphs(content: string): number {
		// <p> 태그, <div> 태그, <br> 태그 등을 고려
		const paragraphTags = (content.match(/<p[\s>]/gi) || []).length;
		const divTags = (content.match(/<div[\s>]/gi) || []).length;
		const brTags = (content.match(/<br\s*\/?>(?!\s*<br)/gi) || []).length;

		// 단락 구분자로 사용되는 요소들
		const paragraphBreaks = Math.max(paragraphTags, divTags / 2, brTags / 2);

		// 최소 1개 단락 보장
		return Math.max(1, paragraphBreaks);
	}

	/**
	 * 링크 수를 계산합니다.
	 * @param html HTML 컨텐츠
	 * @returns 링크 수
	 */
	private countLinks(html: string): number {
		return (html.match(/<a[\s>]/gi) || []).length;
	}

	/**
	 * 링크 밀도를 계산합니다 (오류 수정).
	 * @param linkCount 링크 수
	 * @param paragraphCount 단락 수
	 * @returns 링크 밀도
	 */
	private calculateLinkDensity(linkCount: number, paragraphCount: number): number {
		if (paragraphCount === 0) return 0;
		return linkCount / paragraphCount;
	}

	/**
	 * 문장 수를 계산합니다.
	 * @param content HTML 컨텐츠
	 * @returns 문장 수
	 */
	private countSentences(content: string): number {
		const text = content.replace(/<[^>]+>/g, '');
		const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
		return sentences.length;
	}

	/**
	 * 단어 수를 계산합니다.
	 * @param content HTML 컨텐츠
	 * @returns 단어 수
	 */
	private countWords(content: string): number {
		const text = content.replace(/<[^>]+>/g, '');
		return text.split(/\s+/).filter((w) => w.trim().length > 0).length;
	}

	/**
	 * 컨텐츠 구조를 분석합니다.
	 * @param content HTML 컨텐츠
	 * @returns ContentStructure
	 */
	private analyzeContentStructure(content: string): ContentStructure {
		const hasHeadings = /<h[1-6][\s>]/i.test(content);
		const hasLists = /<(ul|ol)[\s>]/i.test(content);
		const hasImages = /<img[\s>]/i.test(content);
		const hasCodeBlocks = /<(pre|code)[\s>]/i.test(content);

		// 구조 점수 계산 (0-100)
		let structureScore = 0;
		if (hasHeadings) structureScore += 25;
		if (hasLists) structureScore += 20;
		if (hasImages) structureScore += 15;
		if (hasCodeBlocks) structureScore += 10;

		// 기본 구조 점수
		structureScore += 30;

		return {
			hasHeadings,
			hasLists,
			hasImages,
			hasCodeBlocks,
			structureScore: Math.min(100, structureScore),
		};
	}

	/**
	 * 개선된 가독성 점수를 계산합니다.
	 * @param metrics 텍스트 메트릭
	 * @returns 가독성 점수
	 */
	private calculateReadabilityScore(metrics: {
		textLength: number;
		sentenceCount: number;
		wordCount: number;
		averageSentenceLength: number;
		contentStructure: ContentStructure;
	}): number {
		const { textLength, sentenceCount, wordCount, averageSentenceLength, contentStructure } = metrics;
		// 기본 점수 (텍스트 길이 기반)
		let score = Math.round(textLength / 10); // 10자당 1점으로 상향
		// 문장 구조 점수
		if (sentenceCount > 0) {
			if (averageSentenceLength >= 8 && averageSentenceLength <= 30) {
				score += 10;
			} else if (averageSentenceLength > 30) {
				score -= 5;
			}
		}
		// 구조 점수 반영 (헤딩/리스트/이미지/코드블록 가중치)
		if (contentStructure.hasHeadings) score += 5;
		if (contentStructure.hasLists) score += 3;
		if (contentStructure.hasImages) score += 2;
		if (contentStructure.hasCodeBlocks) score += 2;
		score += Math.round(contentStructure.structureScore / 10);
		// 의미 기반 점수: 문장수와 텍스트 길이의 곱의 루트
		if (sentenceCount > 0 && textLength > 0) {
			score += Math.round(Math.sqrt(sentenceCount * textLength) / 10);
		}
		return Math.max(0, score);
	}

	/**
	 * 컨텐츠가 읽기 쉬운지 판정합니다.
	 * @param metrics 품질 메트릭
	 * @param options 품질 옵션
	 * @returns boolean
	 */
	private isContentReadable(
		metrics: {
			characterCount: number;
			textLength: number;
			readabilityScore: number;
			paragraphCount: number;
			linkDensity: number;
			contentStructure: ContentStructure;
		},
		options: Required<Omit<ContentQualityOptions, 'siteSpecific'>>,
	): boolean {
		return (
			metrics.characterCount >= options.charThreshold &&
			metrics.textLength >= options.minContentLength &&
			metrics.readabilityScore >= options.minScore &&
			metrics.paragraphCount >= options.minParagraphs &&
			metrics.linkDensity <= options.maxLinkDensity
		);
	}
}
