/**
 * The result of a scrape operation.
 */
export interface ScrapedContentOutput {
	/** 마지막으로 확인된 URL (리디렉션 반영) */
	finalUrl: string;

	/** 페이지 <title> 또는 PDF 파일 이름 */
	title?: string;

	/** HTML 본문(outerHTML) 또는 기타 텍스트 콘텐츠 */
	content?: string;

	/** MIME 타입 (예: text/html, application/pdf) */
	contentType?: string;
}
