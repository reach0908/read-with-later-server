import { Injectable } from '@nestjs/common';
import * as TurndownService from 'turndown';
import { HtmlConverter } from '../interfaces/html-converter.interface';
import { SCRAPER_CONSTANTS } from '../constants/scraper.constants';

@Injectable()
export class TurndownHtmlConverter implements HtmlConverter {
	private readonly turndownService: any;

	constructor() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		this.turndownService = new (TurndownService as any)({
			headingStyle: SCRAPER_CONSTANTS.TURNDOWN.HEADING_STYLE,
			codeBlockStyle: SCRAPER_CONSTANTS.TURNDOWN.CODE_BLOCK_STYLE,
			bulletListMarker: '-',
			hr: '---',
			br: '  \n', // 줄바꿈을 마크다운 줄바꿈으로 변환
			emDelimiter: '*',
			strongDelimiter: '**',
			linkStyle: 'inlined', // 인라인 링크로 변경
			linkReferenceStyle: 'full',
			blankReplacement: (content: string, node: any) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				return node.isBlock ? '\n\n' : '';
			},
		});

		this.setupCustomRules();
	}

	convert(html: string): string {
		// HTML 전처리 - 불필요한 스크립트/스타일 제거
		const cleanedHtml: string = this.preprocessHtml(html);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const markdown: string = this.turndownService.turndown(cleanedHtml) as string;

		// 마크다운 후처리
		return this.postprocessMarkdown(markdown);
	}

	private preprocessHtml(html: string): string {
		// 스크립트, 스타일, 댓글 등 불필요한 요소 제거
		let cleaned = html
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

		// 플랫폼별 불필요한 요소 제거
		cleaned = this.removePlatformSpecificElements(cleaned);

		// 공백 정리
		return cleaned
			.replace(/\s+/g, ' ') // 연속된 공백 정리
			.replace(/>\s+</g, '><') // 태그 간 공백 제거
			.trim();
	}

	private removePlatformSpecificElements(html: string): string {
		const platformRemovals = [
			// Medium 특화 제거
			/<div[^>]*class="[^"]*js-postActionsFooter[^"]*"[^>]*>.*?<\/div>/gi,
			/<div[^>]*class="[^"]*u-borderBox[^"]*"[^>]*>.*?<\/div>/gi,

			// Naver Blog 특화 제거
			/<div[^>]*class="[^"]*se-section-oglink[^"]*"[^>]*>.*?<\/div>/gi,
			/<div[^>]*class="[^"]*se-component-adarea[^"]*"[^>]*>.*?<\/div>/gi,

			// 일반적인 광고/관련 콘텐츠 제거
			/<div[^>]*class="[^"]*ad[^"]*"[^>]*>.*?<\/div>/gi,
			/<div[^>]*class="[^"]*advertisement[^"]*"[^>]*>.*?<\/div>/gi,
			/<div[^>]*class="[^"]*related[^"]*"[^>]*>.*?<\/div>/gi,
			/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>.*?<\/div>/gi,

			// 빈 요소들 제거
			/<div[^>]*>\s*<\/div>/gi,
			/<span[^>]*>\s*<\/span>/gi,
			/<p[^>]*>\s*<\/p>/gi,
			/<blockquote[^>]*>\s*<\/blockquote>/gi,

			// 빈 링크들 제거
			/<a[^>]*href=["']#["'][^>]*>\s*<\/a>/gi,
			/<a[^>]*href=["']#!["'][^>]*>\s*<\/a>/gi,
			/<a[^>]*href=["']javascript:void\(0\)["'][^>]*>\s*<\/a>/gi,
			/<a[^>]*href=["']javascript:;["'][^>]*>\s*<\/a>/gi,
			/<a[^>]*>\s*<\/a>/gi, // href가 없는 빈 링크

			// 스타일링 전용 div 제거 (content가 없거나 매우 짧은)
			/<div[^>]*class="[^"]*(?:spacer|divider|separator|gap|margin|padding)[^"]*"[^>]*>.*?<\/div>/gi,

			// 네비게이션, 푸터 등
			/<footer[^>]*>.*?<\/footer>/gi,
			/<nav[^>]*>.*?<\/nav>/gi,
			/<aside[^>]*>.*?<\/aside>/gi,

			// 소셜 미디어 버튼들
			/<div[^>]*class="[^"]*(?:social|share|like|comment)[^"]*"[^>]*>.*?<\/div>/gi,
		];

		let cleaned = html;
		platformRemovals.forEach((regex) => {
			cleaned = cleaned.replace(regex, '');
		});

		return cleaned;
	}

	private postprocessMarkdown(markdown: string): string {
		return (
			markdown
				// 빈 인용문들 제거 (빈 콜아웃 포함)
				.replace(/\n>\s*\*\*[^*]+\*\*\s*\n>\s*\n>\s*\n\n/g, '\n\n')
				.replace(/\n>\s*\n\n/g, '\n\n')
				.replace(/\n>\s*$\n/g, '\n')
				// 연속된 빈 줄을 2개로 제한
				.replace(/\n{3,}/g, '\n\n')
				// 리스트와 다른 요소 사이에 적절한 간격
				.replace(/\n(\s*[-*+])/g, '\n\n$1')
				.replace(/([-*+]\s+.*)\n([^\s-*+\n])/g, '$1\n\n$2')
				// 헤딩과 다른 요소 사이 간격 조정
				.replace(/\n(#{1,6}\s+.*)\n([^#\n])/g, '\n$1\n\n$2')
				.replace(/([^#\n])\n(#{1,6}\s+)/g, '$1\n\n$2')
				// 코드 블록 주변 간격 조정
				.replace(/\n```/g, '\n\n```')
				.replace(/```\n([^`])/g, '```\n\n$1')
				// 표 주변 간격 조정
				.replace(/\n\|/g, '\n\n|')
				.replace(/\|\n([^|])/g, '|\n\n$1')
				// 인용문 주변 간격 조정 (빈 인용문이 아닌 경우만)
				.replace(/\n(>[^\n]*[^\s>][^\n]*)/g, '\n\n$1')
				.replace(/(>[^\n]*[^\s>][^\n]*)\n([^>\n])/g, '$1\n\n$2')
				// 이미지 주변 간격 조정
				.replace(/\n!\[/g, '\n\n![')
				.replace(/!\[([^\]]*)\]\(([^)]+)\)\n([^\n])/g, '![$1]($2)\n\n$3')
				.replace(/([^\n])\n!\[/g, '$1\n\n![')
				// 마지막 정리
				.replace(/^\n+|\n+$/g, '') // 시작과 끝의 불필요한 줄바꿈 제거
				.trim()
		);
	}

	private setupCustomRules(): void {
		// Callout/알림 박스 처리
		this.addCalloutRule();

		// 코드 블록 개선
		this.addCodeBlockRule();

		// 이미지 처리 개선
		this.addImageRule();

		// 표 처리 개선
		this.addTableRule();

		// 인용문 처리 개선
		this.addBlockquoteRule();

		// 리스트 처리 개선
		this.addListRule();

		// 강조 표시 개선
		this.addHighlightRule();

		// 세부 정보/접기 처리
		this.addDetailsRule();

		// 비디오 및 임베드 처리
		this.addVideoRule();

		// 수식 처리
		this.addMathRule();

		// 각주 처리
		this.addFootnoteRule();

		// 링크 처리 개선
		this.addLinkRule();

		// Figure 및 캡션 처리
		this.addFigureRule();

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.keep([...SCRAPER_CONSTANTS.TURNDOWN.PRESERVED_ELEMENTS, 'video', 'audio', 'svg']);
	}

	private addCalloutRule(): void {
		const calloutRule = {
			filter: (node: HTMLElement) => {
				// 더 엄격한 필터링: 특정 클래스명과 실제 콘텐츠가 있는 경우만
				if (node.nodeName !== 'DIV' || typeof node.getAttribute !== 'function') {
					return false;
				}

				const className = node.getAttribute('class') || '';

				// 더 구체적인 콜아웃 클래스만 매칭 (일반적인 alert, note 등은 제외)
				const hasCalloutClass =
					className.includes('callout-') ||
					className.includes('alert-box') ||
					className.includes('notice-box') ||
					className.includes('warning-box') ||
					className.includes('note-box') ||
					className.includes('tip-box') ||
					className.includes('important-box') ||
					className.match(/\b(callout|admonition)\b/); // 정확한 단어 매칭

				// 실제 텍스트 콘텐츠가 있는지 확인
				const textContent = (node.textContent || '').trim();
				const hasSubstantialContent = textContent.length >= 10; // 최소 10글자 이상

				return hasCalloutClass && hasSubstantialContent;
			},
			replacement: (content: string, node: HTMLElement) => {
				// 콘텐츠가 비어있거나 너무 짧으면 일반 텍스트로 처리
				const cleanContent = content.trim();
				if (!cleanContent || cleanContent.length < 10) {
					return cleanContent;
				}

				const className = node.getAttribute('class') || '';
				let prefix = '📝';
				let title = '알림';

				if (className.includes('warning')) {
					prefix = '⚠️';
					title = '경고';
				} else if (className.includes('error') || className.includes('danger')) {
					prefix = '❌';
					title = '오류';
				} else if (className.includes('success')) {
					prefix = '✅';
					title = '성공';
				} else if (className.includes('info')) {
					prefix = 'ℹ️';
					title = '정보';
				} else if (className.includes('tip')) {
					prefix = '💡';
					title = '팁';
				} else if (className.includes('important')) {
					prefix = '🔥';
					title = '중요';
				}

				return `\n> ${prefix} **${title}**\n> \n> ${cleanContent.replace(/\n/g, '\n> ')}\n\n`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('callout', calloutRule);
	}

	private addCodeBlockRule(): void {
		const codeBlockRule = {
			filter: ['pre'],
			replacement: (content: string, node: HTMLElement) => {
				const codeElement = node.querySelector('code');
				const language =
					codeElement?.getAttribute('class')?.match(/language-(\w+)/)?.[1] ||
					codeElement?.getAttribute('data-language') ||
					node.getAttribute('data-language') ||
					'';

				// 코드 내용 정리
				const cleanContent = content
					.replace(/^\n+|\n+$/g, '') // 앞뒤 빈 줄 제거
					.replace(/\n\s*\n/g, '\n'); // 중간 빈 줄 제거

				return `\n\`\`\`${language}\n${cleanContent}\n\`\`\`\n\n`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('codeBlock', codeBlockRule);
	}

	private addImageRule(): void {
		const imageRule = {
			filter: 'img',
			replacement: (_content: string, node: HTMLElement) => {
				const alt = node.getAttribute('alt') || '';
				const title = node.getAttribute('title');

				// 고해상도 이미지 URL 찾기 (우선순위 순서)
				const src = this.getBestImageSrc(node);

				if (!src) return '';

				// 상대 경로를 절대 경로로 변환
				const finalSrc = this.normalizeImageUrl(src);

				const titlePart = title ? ` "${title}"` : '';
				const altText = alt || '이미지';

				return `![${altText}](${finalSrc}${titlePart})`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('image', imageRule);
	}

	private getBestImageSrc(imgElement: HTMLElement): string {
		// srcset에서 가장 큰 이미지 선택
		const srcset = imgElement.getAttribute('srcset');
		if (srcset) {
			const bestSrc = this.parseSrcset(srcset);
			if (bestSrc) return bestSrc;
		}

		// 다양한 지연 로딩 속성에서 고해상도 이미지 찾기
		const possibleSrcs = [
			imgElement.getAttribute('data-original'), // 일반적인 지연 로딩
			imgElement.getAttribute('data-src'), // 지연 로딩
			imgElement.getAttribute('data-lazy-src'), // 지연 로딩
			imgElement.getAttribute('data-full-src'), // 풀 사이즈
			imgElement.getAttribute('data-hd-src'), // 고해상도
			imgElement.getAttribute('data-large-src'), // 큰 이미지
			imgElement.getAttribute('data-zoom-src'), // 줌 이미지
			imgElement.getAttribute('src'), // 기본 src (마지막 우선순위)
		];

		for (const src of possibleSrcs) {
			if (src && src.trim() && !this.isLowQualityImage(src)) {
				return src;
			}
		}

		return imgElement.getAttribute('src') || '';
	}

	private parseSrcset(srcset: string): string | null {
		// srcset 파싱: "image1.jpg 1x, image2.jpg 2x" 형태
		const sources = srcset.split(',').map((s) => s.trim());
		let bestSrc = '';
		let maxWidth = 0;

		for (const source of sources) {
			const parts = source.split(/\s+/);
			if (parts.length >= 2) {
				const url = parts[0];
				const descriptor = parts[1];

				// 픽셀 밀도 (2x, 3x) 또는 너비 (1200w) 파싱
				const widthMatch = descriptor.match(/(\d+)w/);
				const densityMatch = descriptor.match(/(\d+(?:\.\d+)?)x/);

				let effectiveWidth = 0;
				if (widthMatch) {
					effectiveWidth = parseInt(widthMatch[1]);
				} else if (densityMatch) {
					effectiveWidth = parseFloat(densityMatch[1]) * 1000; // 밀도를 너비로 근사 변환
				}

				if (effectiveWidth > maxWidth) {
					maxWidth = effectiveWidth;
					bestSrc = url;
				}
			}
		}

		return bestSrc || null;
	}

	private isLowQualityImage(src: string): boolean {
		// 썸네일이나 저화질 이미지 패턴 감지
		const lowQualityPatterns = [
			/thumb/i,
			/thumbnail/i,
			/small/i,
			/preview/i,
			/low/i,
			/_s\./, // _s.jpg 형태
			/_thumb\./, // _thumb.jpg 형태
			/_small\./, // _small.jpg 형태
			/\d+x\d+/, // 150x150 같은 작은 크기
		];

		return lowQualityPatterns.some((pattern) => pattern.test(src));
	}

	private normalizeImageUrl(src: string): string {
		// 프로토콜이 없는 URL 처리
		if (src.startsWith('//')) {
			return `https:${src}`;
		}

		// 상대 경로는 그대로 (base URL이 필요하지만 복잡하므로 일단 유지)
		if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
			return src;
		}

		// 이미 절대 URL인 경우
		if (src.startsWith('http://') || src.startsWith('https://')) {
			return src;
		}

		// 기타 경우는 https 추가
		return src.startsWith('www.') ? `https://${src}` : src;
	}

	private addTableRule(): void {
		const tableRule = {
			filter: 'table',
			replacement: (content: string, node: HTMLElement) => {
				// 테이블이 이미 마크다운 형식이면 그대로 반환
				if (content.includes('|')) {
					return `\n${content}\n\n`;
				}

				// 간단한 테이블 변환 시도
				const rows = node.querySelectorAll('tr');
				if (rows.length === 0) return `\n${content}\n\n`;

				const markdownRows: string[] = [];

				rows.forEach((row, index) => {
					const cells = row.querySelectorAll('td, th');
					const cellTexts = Array.from(cells).map((cell) =>
						(cell.textContent || '').trim().replace(/\|/g, '\\|'),
					);

					if (cellTexts.length > 0) {
						markdownRows.push(`| ${cellTexts.join(' | ')} |`);

						// 헤더 후 구분선 추가
						if (index === 0 && row.querySelector('th')) {
							const separators = cellTexts.map(() => '---');
							markdownRows.push(`| ${separators.join(' | ')} |`);
						}
					}
				});

				return markdownRows.length > 0 ? `\n${markdownRows.join('\n')}\n\n` : `\n${content}\n\n`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('table', tableRule);
	}

	private addBlockquoteRule(): void {
		const blockquoteRule = {
			filter: 'blockquote',
			replacement: (content: string) => {
				const cleanContent = content.replace(/^\n+|\n+$/g, '').trim();

				// 빈 인용문이나 너무 짧은 내용은 무시
				if (!cleanContent || cleanContent.length < 5) {
					return cleanContent || '';
				}

				// 공백만 있는 인용문도 무시
				if (cleanContent.match(/^\s*$/)) {
					return '';
				}

				return `\n> ${cleanContent.replace(/\n/g, '\n> ')}\n\n`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('blockquote', blockquoteRule);
	}

	private addListRule(): void {
		const listRule = {
			filter: (node: HTMLElement) => {
				return node.nodeName === 'LI' && node.parentNode?.nodeName === 'OL';
			},
			replacement: (content: string, node: HTMLElement) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const parent = node.parentNode;
				if (!parent) return `1. ${content}\n`;

				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
				const index = Array.prototype.indexOf.call((parent as HTMLElement).children, node) + 1;
				const prefix = `${index}. `;

				// 중첩된 리스트 처리
				const processedContent = content.replace(/\n(\s*[-*+\d+.])/g, '\n   $1');

				return prefix + processedContent + '\n';
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('orderedList', listRule);
	}

	private addHighlightRule(): void {
		const highlightRule = {
			filter: (node: HTMLElement) => {
				return (
					node.nodeName === 'MARK' ||
					(node.nodeName === 'SPAN' &&
						(node.getAttribute('class')?.includes('highlight') ||
							node.getAttribute('style')?.includes('background')))
				);
			},
			replacement: (content: string) => {
				return `==${content}==`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('highlight', highlightRule);
	}

	private addDetailsRule(): void {
		const detailsRule = {
			filter: 'details',
			replacement: (content: string, node: HTMLElement) => {
				const summary = node.querySelector('summary');
				const summaryText = summary?.textContent || '세부 정보';
				const detailContent = content.replace(summaryText, '').trim();

				return `\n<details>\n<summary>${summaryText}</summary>\n\n${detailContent}\n\n</details>\n\n`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('details', detailsRule);
	}

	private addVideoRule(): void {
		const videoRule = {
			filter: ['video', 'iframe'],
			replacement: (_content: string, node: HTMLElement) => {
				const src = node.getAttribute('src') || node.querySelector('source')?.getAttribute('src') || '';
				const title = node.getAttribute('title') || '비디오';

				if (!src) return '';

				// YouTube, Vimeo 등 임베드 처리
				if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com')) {
					return `\n📹 **${title}**\n[${src}](${src})\n\n`;
				}

				return `\n<video controls>\n  <source src="${src}">\n</video>\n\n`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('video', videoRule);
	}

	private addMathRule(): void {
		const mathRule = {
			filter: (node: HTMLElement) => {
				return (
					node.nodeName === 'SPAN' &&
					(node.getAttribute('class')?.includes('math') ||
						node.getAttribute('class')?.includes('katex') ||
						node.getAttribute('class')?.includes('latex'))
				);
			},
			replacement: (content: string, node: HTMLElement) => {
				const isBlock = node.getAttribute('class')?.includes('display') || node.parentNode?.nodeName === 'DIV';

				if (isBlock) {
					return `\n$$\n${content}\n$$\n\n`;
				} else {
					return `$${content}$`;
				}
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('math', mathRule);
	}

	private addFootnoteRule(): void {
		const footnoteRule = {
			filter: (node: HTMLElement) => {
				return (
					(node.nodeName === 'SUP' && node.textContent?.match(/^\d+$/)) ||
					(node.nodeName === 'A' && node.getAttribute('href')?.startsWith('#fn'))
				);
			},
			replacement: (content: string) => {
				return `[^${content}]`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('footnote', footnoteRule);
	}

	private addLinkRule(): void {
		const linkRule = {
			filter: 'a',
			replacement: (content: string, node: HTMLElement) => {
				const href = node.getAttribute('href') || '';
				const title = node.getAttribute('title');
				const textContent = (content || '').trim();

				// 이미지만 포함된 링크는 이미지만 반환
				if (this.containsOnlyImage(node)) {
					return content;
				}

				// 빈 링크나 의미 없는 앵커는 텍스트만 반환
				if (
					!href ||
					href === '#' ||
					href === '#!' ||
					href === 'javascript:void(0)' ||
					href === 'javascript:;' ||
					!textContent
				) {
					return textContent;
				}

				// 앵커 링크 (페이지 내 링크)는 텍스트만 반환
				if (href.startsWith('#') && href.length > 1) {
					return textContent;
				}

				// 이메일 링크 처리
				if (href.startsWith('mailto:')) {
					return `[${textContent}](${href})`;
				}

				// 전화번호 링크 처리
				if (href.startsWith('tel:')) {
					return `[${textContent}](${href})`;
				}

				// 정상적인 URL 링크
				if (this.isValidUrl(href)) {
					const titlePart = title ? ` "${title}"` : '';
					return `[${textContent}](${href}${titlePart})`;
				}

				// 기타 경우는 텍스트만 반환
				return textContent;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('link', linkRule);
	}

	private containsOnlyImage(linkElement: HTMLElement): boolean {
		const children = Array.from(linkElement.children);
		const textContent = linkElement.textContent?.trim() || '';

		// 자식이 img만 있고 다른 텍스트가 없는 경우
		return children.length === 1 && children[0].tagName === 'IMG' && textContent.length === 0;
	}

	private isValidUrl(url: string): boolean {
		// 상대 경로나 앵커는 유효하지 않은 것으로 처리
		if (url.startsWith('/') || url.startsWith('#') || url.startsWith('javascript:')) {
			return false;
		}

		// 프로토콜이 있는 절대 URL인지 확인
		return /^https?:\/\//.test(url) || /^\/\//.test(url) || /^www\./.test(url);
	}

	private addFigureRule(): void {
		const figureRule = {
			filter: 'figure',
			replacement: (content: string, node: HTMLElement) => {
				const img = node.querySelector('img');
				const figcaption = node.querySelector('figcaption');

				if (!img) {
					// 이미지가 없는 figure는 일반 콘텐츠로 처리
					return `\n\n${content}\n\n`;
				}

				// 이미지 정보 추출
				const src = this.getBestImageSrc(img);
				const alt = img.getAttribute('alt') || '';
				const title = img.getAttribute('title');

				if (!src) return '';

				const finalSrc = this.normalizeImageUrl(src);
				const altText = alt || '이미지';

				// 캡션 처리
				let captionText = '';
				if (figcaption) {
					captionText = figcaption.textContent?.trim() || '';
				}

				// 제목 우선순위: title 속성 > figcaption > alt
				const finalTitle = title || captionText || '';
				const titlePart = finalTitle ? ` "${finalTitle}"` : '';

				let result = `![${altText}](${finalSrc}${titlePart})`;

				// 캡션이 있고 title과 다른 경우 별도 표시
				if (captionText && captionText !== title && captionText !== alt) {
					result += `\n*${captionText}*`;
				}

				return `\n\n${result}\n\n`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('figure', figureRule);
	}
}
