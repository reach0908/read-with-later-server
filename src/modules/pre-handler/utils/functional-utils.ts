/**
 * 함수형 프로그래밍 기반 공통 유틸리티 함수 모음
 * - Result/Option 타입
 * - fetchHtml, createDom, createDomFromUrl 등
 * - map/flatMap/compose 등 고차 함수
 * - extractTitle, findContentElement 등
 */
import { JSDOM } from 'jsdom';
import { HttpRequestConfig, DomConfig } from '../types/content-extraction.types';

/**
 * Result 타입 - 성공/실패를 명시적으로 표현
 */
export type Result<T, E = Error> =
	| { readonly success: true; readonly data: T }
	| { readonly success: false; readonly error: E };

/**
 * Option 타입 - 값이 있을 수도 없을 수도 있음을 명시적으로 표현
 */
export type Option<T> = T | null | undefined;

/**
 * 콘텐츠 추출 과정에서 발생하는 에러를 명확하게 구분하기 위한 커스텀 에러
 */
export class ContentExtractionError extends Error {
	public readonly cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = 'ContentExtractionError';
		this.cause = cause;
	}
}

/**
 * 네트워크 요청 실패 등 외부 통신 관련 에러
 */
export class NetworkError extends Error {
	public readonly cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = 'NetworkError';
		this.cause = cause;
	}
}

/**
 * HTTP 요청을 통해 HTML 문자열을 가져옵니다.
 * @param url 요청할 URL
 * @param config HTTP 요청 설정
 * @returns HTML 문자열 또는 에러
 */
export const fetchHtml = async (url: string, config: HttpRequestConfig): Promise<Result<string, Error>> => {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), config.timeout);

		const response = await fetch(url, {
			headers: config.headers,
			redirect: config.redirect,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			return {
				success: false,
				error: new NetworkError(`HTTP ${response.status}: ${response.statusText}`),
			};
		}

		const html = await response.text();
		return { success: true, data: html };
	} catch (error) {
		return {
			success: false,
			error: new NetworkError('Network request failed', error),
		};
	}
};

/**
 * HTML 문자열로부터 JSDOM 인스턴스를 생성합니다.
 * @param html HTML 문자열
 * @param config DOM 생성 설정
 * @returns JSDOM 인스턴스 또는 에러
 */
export const createDom = (html: string, config: DomConfig): Result<JSDOM, Error> => {
	try {
		const dom = new JSDOM(html, {
			userAgent: config.userAgent,
			resources: config.resources === 'usable' ? 'usable' : undefined,
			runScripts: config.runScripts,
			pretendToBeVisual: config.pretendToBeVisual,
		});
		const window = dom.window;

		// matchMedia 모킹
		if (!window.matchMedia) {
			window.matchMedia = () => ({
				matches: false,
				media: '',
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
			});
		}

		// fetch 모킹 (이미 Node.js에 있지만 안전을 위해)
		if (!window.fetch) {
			window.fetch = global.fetch;
		}

		// elementFromPoint 모킹 (JSDOM 미구현 방지)
		if (typeof window.document.elementFromPoint !== 'function') {
			window.document.elementFromPoint = () => null;
		}

		return { success: true, data: dom };
	} catch (error) {
		return {
			success: false,
			error: new ContentExtractionError('DOM creation failed', error),
		};
	}
};

/**
 * URL로부터 JSDOM 인스턴스를 생성합니다.
 * @param url HTML을 가져올 URL
 * @param config DOM 생성 설정
 * @returns JSDOM 인스턴스 또는 에러
 */
export const createDomFromUrl = async (url: string, config: DomConfig): Promise<Result<JSDOM, Error>> => {
	try {
		const dom = await JSDOM.fromURL(url, {
			userAgent: config.userAgent,
			resources: config.resources === 'usable' ? 'usable' : undefined,
			runScripts: config.runScripts,
			pretendToBeVisual: config.pretendToBeVisual,
		});
		return { success: true, data: dom };
	} catch (error) {
		return {
			success: false,
			error: new ContentExtractionError('DOM creation from URL failed', error),
		};
	}
};

/**
 * 여러 셀렉터와 정규표현식을 이용해 제목을 추출합니다.
 * @param document DOM 문서
 * @param selectors 셀렉터 목록
 * @param patterns 정제용 정규표현식 목록
 * @returns 추출된 제목 또는 null
 */
export const extractTitle = (
	document: Document,
	selectors: readonly string[],
	patterns: readonly RegExp[],
): Option<string> => {
	for (const selector of selectors) {
		const element = document.querySelector(selector);
		if (element) {
			const title = element.getAttribute('content') || element.textContent;
			if (title?.trim()) {
				return patterns.reduce((cleanedTitle, pattern) => cleanedTitle.replace(pattern, ''), title.trim());
			}
		}
	}
	return null;
};

/**
 * 여러 셀렉터를 이용해 본문 콘텐츠 요소를 찾습니다.
 * @param document DOM 문서
 * @param selectors 셀렉터 목록
 * @param minTextLength 최소 텍스트 길이 (기본값 80)
 * @param logger (선택) 로깅용
 * @returns 콘텐츠 요소 또는 null
 */
export const findContentElement = (
	document: Document,
	selectors: readonly string[],
	minTextLength: number = 80,
	logger?: { debug?: (msg: string) => void },
): Option<Element> => {
	let bestElement: Element | null = null;
	let maxLength = 0;
	for (const selector of selectors) {
		const element = document.querySelector(selector);
		if (element?.textContent) {
			const len = element.textContent.trim().length;
			if (len > maxLength) {
				bestElement = element;
				maxLength = len;
			}
			if (len >= minTextLength) {
				logger?.debug?.(`[findContentElement] selector '${selector}' matched element with length ${len}`);
			}
		}
	}
	if (bestElement && maxLength >= minTextLength) {
		return bestElement;
	}
	logger?.debug?.(
		`[findContentElement] No selector matched element with length >= ${minTextLength}, fallback to null`,
	);
	return null;
};

/**
 * 파일 경로나 URL 경로에서 타이틀을 추출하는 유틸 함수
 * @param path 파일명 또는 URL 경로
 * @param options 옵션 (확장자 제거 여부 등)
 * @returns 추출된 타이틀 문자열
 */
export const extractTitleFromPath = (path: string, options?: { removeExtension?: boolean }): string => {
	let title =
		path
			.split('/')
			.filter((part) => part.length > 0)
			.pop() ?? '';
	if (options?.removeExtension) {
		title = title.replace(/\.[a-zA-Z0-9]+$/, '');
	}
	title = title
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (l) => l.toUpperCase())
		.trim();
	return title;
};

/**
 * 여러 함수를 합성하는 함수형 유틸
 * @param fns 합성할 함수들
 * @returns 합성된 함수
 */
export function compose<T, A extends unknown[]>(...fns: Array<(arg: T, ...rest: A) => T>): (arg: T, ...rest: A) => T {
	return (arg: T, ...rest: A) => fns.reduce((acc, fn) => fn(acc, ...rest), arg);
}
