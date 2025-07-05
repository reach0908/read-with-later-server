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
				error: new Error(`HTTP ${response.status}: ${response.statusText}`),
			};
		}

		const html = await response.text();
		return { success: true, data: html };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
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
			error: error instanceof Error ? error : new Error(String(error)),
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
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
};

/**
 * Result 타입을 변환하는 고차 함수
 * @param result 원본 Result
 * @param fn 변환 함수
 * @returns 변환된 Result
 */
export const mapResult = <T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> => {
	if (result.success) {
		return { success: true, data: fn(result.data) };
	}
	return result;
};

/**
 * Result 타입의 에러를 변환하는 고차 함수
 * @param result 원본 Result
 * @param fn 에러 변환 함수
 * @returns 변환된 Result
 */
export const mapError = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => {
	if (!result.success) {
		return { success: false, error: fn(result.error) };
	}
	return result;
};

/**
 * Result 타입을 flatMap하는 고차 함수
 * @param result 원본 Result
 * @param fn 변환 함수
 * @returns 변환된 Result
 */
export const flatMapResult = <T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E> => {
	if (result.success) {
		return fn(result.data);
	}
	return result;
};

/**
 * Option 타입을 변환하는 고차 함수
 * @param option 원본 Option
 * @param fn 변환 함수
 * @returns 변환된 Option
 */
export const mapOption = <T, U>(option: Option<T>, fn: (value: T) => U): Option<U> => {
	return option != null ? fn(option) : null;
};

/**
 * Option 타입을 flatMap하는 고차 함수
 * @param option 원본 Option
 * @param fn 변환 함수
 * @returns 변환된 Option
 */
export const flatMapOption = <T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> => {
	return option != null ? fn(option) : null;
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
 * @param minTextLength 최소 텍스트 길이
 * @returns 콘텐츠 요소 또는 null
 */
export const findContentElement = (
	document: Document,
	selectors: readonly string[],
	minTextLength: number = 100,
): Option<Element> => {
	for (const selector of selectors) {
		const element = document.querySelector(selector);
		if (element?.textContent && element.textContent.trim().length > minTextLength) {
			return element;
		}
	}
	return document.body || null;
};

/**
 * 여러 정제 함수를 순차적으로 적용하는 함수 합성
 * @param fns 정제 함수 목록
 * @returns 합성된 정제 함수
 */
export const compose = <T>(...fns: ((arg: T, ctx: any) => T)[]): ((arg: T, ctx: any) => T) => {
	return (element: T, context: any): T => {
		return fns.reduce((acc, fn) => fn(acc, context), element);
	};
};

/**
 * 부분 적용 함수
 * @param fn 원본 함수
 * @param first 첫 번째 인자
 * @returns 두 번째 인자만 받는 함수
 */
export const partial = <T, U, V>(fn: (a: T, b: U) => V, first: T): ((second: U) => V) => {
	return (second: U) => fn(first, second);
};
