/**
 * 콘텐츠 정제 파이프라인 함수 모음
 * - removeUnwantedElements, cleanupStyles, cleanupLinks, cleanupImages, cleanupText, refineTitle
 * - createContentCleaningPipeline
 */
import { CleaningFunction, ContentCleaningConfig, CleaningContext } from '../types/content-extraction.types';
import { compose } from './functional-utils';

/**
 * 불필요한 요소를 제거합니다.
 * @param element 정제할 요소
 * @param context 정제 컨텍스트 (logger만 사용)
 * @returns 정제된 요소
 */
export const removeUnwantedElements: CleaningFunction<Element> = (element, context: CleaningContext) => {
	const unwantedSelectors = [
		'nav',
		'.nav',
		'.navigation',
		'.menu',
		'.navbar',
		'header',
		'.header',
		'.site-header',
		'footer',
		'.footer',
		'.site-footer',
		'aside',
		'.sidebar',
		'.side-bar',
		'.widget',
		'.ad',
		'.advertisement',
		'.ads',
		'[class*="ad-"]',
		'[id*="ad-"]',
		'[class*="banner"]',
		'[id*="banner"]',
		'.social',
		'.share',
		'.social-share',
		'[class*="social"]',
		'[id*="social"]',
		'.comment',
		'.comments',
		'#comments',
		'[class*="comment"]',
		'[id*="comment"]',
		'.breadcrumb',
		'.breadcrumbs',
		'.pagination',
		'.pager',
		'.author-bio',
		'.author-info',
		'.newsletter-signup',
		'.subscribe',
		'.cookie-notice',
		'.privacy-notice',
		'.back-to-top',
		'.scroll-top',
		'.login',
		'.auth',
		'.signup',
		'script',
		'style',
		'noscript',
		'[style*="display: none"]',
		'[style*="display:none"]',
		'.hidden',
		'.invisible',
		'[aria-hidden="true"]',
		'iframe[src*="tracking"]',
		'iframe[src*="analytics"]',
		'iframe[src*="google-analytics"]',
		'iframe[src*="facebook"]',
		'[class*="tracking"]',
		'[id*="tracking"]',
		'[class*="analytics"]',
		'[id*="analytics"]',
	];
	unwantedSelectors.forEach((selector) => {
		try {
			const elements = element.querySelectorAll(selector);
			elements.forEach((el) => el.remove());
		} catch {
			(context.logger as { debug?: (msg: string) => void })?.debug?.(`Invalid selector: ${selector}`);
		}
	});
	return element;
};

/**
 * 인라인 스타일을 정리합니다.
 */
export const cleanupStyles: CleaningFunction<Element> = (element) => {
	const elementsWithStyle = element.querySelectorAll('[style]');
	elementsWithStyle.forEach((el) => {
		const style = el.getAttribute('style');
		if (style) {
			const keepStyles = style.match(
				/(font-size|color|background-color|text-align|line-height|margin|padding|border):[^;]+;?/g,
			);
			if (keepStyles) {
				el.setAttribute('style', keepStyles.join(' '));
			} else {
				el.removeAttribute('style');
			}
		}
	});
	return element;
};

/**
 * 링크를 정리합니다.
 */
export const cleanupLinks: CleaningFunction<Element> = (element, context) => {
	const links = element.querySelectorAll('a[href]');
	links.forEach((link) => {
		const href = link.getAttribute('href');
		if (href) {
			try {
				const absoluteUrl = new URL(href, context.baseUrl).href;
				link.setAttribute('href', absoluteUrl);
				link.setAttribute('target', '_blank');
				link.setAttribute('rel', 'noopener noreferrer');
			} catch {
				link.removeAttribute('href');
			}
		}
	});
	return element;
};

/**
 * 이미지를 정리합니다.
 */
export const cleanupImages: CleaningFunction<Element> = (element, context) => {
	const images = element.querySelectorAll('img');
	images.forEach((img) => {
		const width = img.getAttribute('width');
		const height = img.getAttribute('height');
		if (width && height) {
			const w = parseInt(width);
			const h = parseInt(height);
			if (w < 50 || h < 50) {
				img.remove();
				return;
			}
		}
		const dataSrc = img.getAttribute('data-src');
		if (dataSrc && !img.src) {
			img.src = dataSrc;
		}
		if (context.baseUrl && img.src && img.src.startsWith('/')) {
			try {
				img.src = new URL(img.src, context.baseUrl).href;
			} catch {
				img.remove();
				return;
			}
		}
		if (img.src && img.src.startsWith('//')) {
			img.src = 'https:' + img.src;
		}
		(img as HTMLElement).style.maxWidth = '100%';
		(img as HTMLElement).style.height = 'auto';
		img.removeAttribute('data-src');
		img.removeAttribute('loading');
		img.removeAttribute('srcset');
	});
	return element;
};

/**
 * 텍스트를 정리합니다.
 */
export const cleanupText: CleaningFunction<Element> = (element) => {
	const emptyElements = element.querySelectorAll('p, div, span');
	emptyElements.forEach((el) => {
		if (!el.textContent?.trim() && !el.querySelector('img')) {
			el.remove();
		}
	});
	const textNodes = element.ownerDocument?.evaluate(
		'.//text()',
		element,
		null,
		XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
		null,
	);
	if (textNodes) {
		for (let i = 0; i < textNodes.snapshotLength; i++) {
			const node = textNodes.snapshotItem(i);
			if (node && node.textContent) {
				node.textContent = node.textContent.replace(/\s+/g, ' ');
			}
		}
	}
	return element;
};

/**
 * 콘텐츠 정제 파이프라인을 생성합니다.
 * @param config 정제 설정
 * @returns 합성된 정제 함수
 */
export const createContentCleaningPipeline = (config: ContentCleaningConfig): CleaningFunction<Element> => {
	const stages: CleaningFunction<Element>[] = [];
	if (config.removeUnwantedElements) stages.push(removeUnwantedElements);
	if (config.cleanupStyles) stages.push(cleanupStyles);
	if (config.cleanupLinks) stages.push(cleanupLinks);
	if (config.cleanupImages) stages.push(cleanupImages);
	if (config.cleanupText) stages.push(cleanupText);
	return compose(...stages);
};
