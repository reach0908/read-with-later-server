/**
 * 콘텐츠 추출 및 정제 관련 타입 정의
 * 함수형 프로그래밍 및 SOLID 원칙 기반
 */

/**
 * HTTP 요청 설정
 */
export interface HttpRequestConfig {
	/** User-Agent 문자열 */
	readonly userAgent: string;
	/** 요청 타임아웃(ms) */
	readonly timeout: number;
	/** 추가 헤더 */
	readonly headers: Record<string, string>;
	/** 리다이렉트 정책 */
	readonly redirect: RequestRedirect;
}

/**
 * DOM 생성 설정
 */
export interface DomConfig {
	/** User-Agent 문자열 */
	readonly userAgent: string;
	/** 리소스 사용 여부 */
	readonly resources: 'usable' | 'unusable';
	/** 스크립트 실행 정책 */
	readonly runScripts: 'dangerously' | 'outside-only';
	/** 시각적 환경 시뮬레이션 */
	readonly pretendToBeVisual: boolean;
}

/**
 * 콘텐츠 정제 설정
 */
export interface ContentCleaningConfig {
	/** 불필요한 요소 제거 여부 */
	readonly removeUnwantedElements: boolean;
	/** 스타일 정리 여부 */
	readonly cleanupStyles: boolean;
	/** 링크 정리 여부 */
	readonly cleanupLinks: boolean;
	/** 이미지 정리 여부 */
	readonly cleanupImages: boolean;
	/** 텍스트 정리 여부 */
	readonly cleanupText: boolean;
	/** 제목 정제 여부 */
	readonly refineTitle: boolean;
}

/**
 * 제목 추출 설정
 */
export interface TitleExtractionConfig {
	/** 제목 추출용 셀렉터 목록 */
	readonly selectors: readonly string[];
	/** 제목 정제용 정규표현식 목록 */
	readonly patterns: readonly RegExp[];
	/** 사이트별 추가 정제 패턴 */
	readonly siteSpecificPatterns: Record<string, readonly RegExp[]>;
}

/**
 * 콘텐츠 추출 결과
 */
export interface ContentExtractionResult {
	/** 추출된 제목 */
	readonly title?: string;
	/** 추출된 본문(HTML) */
	readonly content?: string;
	/** 콘텐츠 타입 */
	readonly contentType: string;
	/** 최종 URL */
	readonly url: string;
}

/**
 * 정제 파이프라인 단계
 */
export type CleaningStage =
	| 'remove-unwanted-elements'
	| 'cleanup-styles'
	| 'cleanup-links'
	| 'cleanup-images'
	| 'cleanup-text'
	| 'refine-title';

/**
 * 정제 함수 타입
 */
export type CleaningFunction<T = Element> = (element: T, context: CleaningContext) => T;

/**
 * 정제 컨텍스트
 */
export interface CleaningContext {
	/** 기준 URL */
	readonly baseUrl: string;
	/** 정제 설정 */
	readonly config: ContentCleaningConfig;
	/** 로거 */
	readonly logger: any;
}
