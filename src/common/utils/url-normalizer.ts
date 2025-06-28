import { URL } from 'url';

/**
 * UTM, FBCLID 등 트래킹 파라미터를 제거해 정규화된 URL을 반환합니다.
 */
export function normalizeUrl(originalUrl: string): string {
	try {
		const url = new URL(originalUrl);
		const paramsToRemove = [
			'utm_source',
			'utm_medium',
			'utm_campaign',
			'utm_term',
			'utm_content',
			'fbclid',
			'gclid',
		];

		paramsToRemove.forEach((param) => url.searchParams.delete(param));

		// 해시(#)는 본문과 관련 없으므로 제거
		url.hash = '';

		return url.toString();
	} catch {
		// URL 파싱 실패 시 원본 그대로 반환
		return originalUrl;
	}
}
