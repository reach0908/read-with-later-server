import { Injectable } from '@nestjs/common';
import { ScrapedContentOutput } from '../dto/scraped-content.output';
import { PreHandleResult } from '../../pre-handler/dto/pre-handle-result.dto';

/**
 * Service responsible for generating HTML previews for scraped content.
 */
@Injectable()
export class ScraperPreviewService {
	/**
	 * Renders the full scraping result into an HTML page.
	 * @param result The scraped content output.
	 * @param originalUrl The original URL requested by the user.
	 * @returns An HTML string.
	 */
	public createResultViewHtml(result: ScrapedContentOutput, originalUrl: string): string {
		return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>스크래핑 결과 - ${result.title || 'Unknown'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metadata {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
        }
        .metadata h3 {
            margin-top: 0;
            color: #495057;
        }
        .metadata-item {
            margin-bottom: 10px;
        }
        .metadata-label {
            font-weight: bold;
            color: #666;
        }
        .url-changed {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .content-preview {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 6px;
            max-height: 400px;
            overflow-y: auto;
            background: #fafafa;
        }
        .no-content {
            color: #999;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 스크래핑 결과</h1>
        
        <div class="metadata">
            <h3>📋 메타데이터</h3>
            <div class="metadata-item">
                <span class="metadata-label">원본 URL:</span> 
                <a href="${originalUrl}" target="_blank">${originalUrl}</a>
            </div>
            <div class="metadata-item">
                <span class="metadata-label">최종 URL:</span> 
                <a href="${result.finalUrl}" target="_blank">${result.finalUrl}</a>
            </div>
            ${
				originalUrl !== result.finalUrl
					? `
            <div class="url-changed">
                ⚠️ URL이 변경되었습니다.
            </div>
            `
					: ''
			}
            <div class="metadata-item">
                <span class="metadata-label">제목:</span> ${result.title || '없음'}
            </div>
            <div class="metadata-item">
                <span class="metadata-label">콘텐츠 타입:</span> ${result.contentType || '없음'}
            </div>
            <div class="metadata-item">
                <span class="metadata-label">콘텐츠 길이:</span> ${result.content?.length || 0} 문자
            </div>
        </div>

        <h3>📄 콘텐츠 미리보기</h3>
        <div class="content-preview">
            ${result.content ? result.content : '<p class="no-content">콘텐츠가 없습니다.</p>'}
        </div>

        <div style="margin-top: 30px; text-align: center;">
            <a href="/scraper/preview?url=${encodeURIComponent(originalUrl)}&mode=content" 
               style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
               콘텐츠만 보기
            </a>
        </div>
    </div>
</body>
</html>`;
	}

	/**
	 * Renders only the extracted content into a clean HTML page.
	 * @param content The extracted HTML content.
	 * @param title The page title.
	 * @param sourceUrl The final URL of the content.
	 * @returns An HTML string.
	 */
	public wrapContentInHtml(content: string, title?: string, sourceUrl?: string): string {
		return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Scraped Content'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .source-url {
            color: #666;
            font-size: 14px;
            word-break: break-all;
        }
        .content {
            color: #333;
        }
        .content img {
            max-width: 100%;
            height: auto;
        }
        .content pre {
            background: #f8f8f8;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .content blockquote {
            border-left: 4px solid #ddd;
            margin-left: 0;
            padding-left: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title || 'Scraped Content'}</h1>
            ${sourceUrl ? `<p class="source-url">출처: <a href="${sourceUrl}" target="_blank">${sourceUrl}</a></p>` : ''}
        </div>
        <div class="content">
            ${content}
        </div>
    </div>
</body>
</html>`;
	}

	/**
	 * Renders the result of the pre-handling phase into an HTML page.
	 * @param originalUrl The original URL requested by the user.
	 * @param result The result from the pre-handler.
	 * @returns An HTML string.
	 */
	public createPreHandleViewHtml(originalUrl: string, result: PreHandleResult): string {
		const handlerUsed = result.handlerUsed || 'N/A';
		return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>사전 처리 결과 - ${handlerUsed}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .handler-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .result-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .result-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
        }
        .result-label {
            font-weight: bold;
            color: #495057;
            margin-bottom: 5px;
        }
        .url-comparison {
            background: #e9ecef;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .url-item {
            margin-bottom: 10px;
            word-break: break-all;
        }
        .url-changed {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .url-unchanged {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .content-preview {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 6px;
            max-height: 300px;
            overflow-y: auto;
            background: #fafafa;
        }
        .no-content {
            color: #999;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 사전 처리 결과</h1>
        
        <div class="handler-badge">${handlerUsed}</div>
        
        <div class="result-grid">
            <div class="result-item">
                <div class="result-label">제목</div>
                <div>${result.title || '없음'}</div>
            </div>
            <div class="result-item">
                <div class="result-label">콘텐츠 타입</div>
                <div>${result.contentType || '없음'}</div>
            </div>
            <div class="result-item">
                <div class="result-label">콘텐츠 길이</div>
                <div>${result.content?.length || 0} 문자</div>
            </div>
            <div class="result-item">
                <div class="result-label">URL 변경 여부</div>
                <div>${originalUrl !== result.url ? '✅ 변경됨' : '❌ 변경되지 않음'}</div>
            </div>
        </div>

        <div class="url-comparison ${originalUrl !== result.url ? 'url-changed' : 'url-unchanged'}">
            <h3>📍 URL 비교</h3>
            <div class="url-item">
                <strong>원본:</strong> ${originalUrl}
            </div>
            <div class="url-item">
                <strong>결과:</strong> ${result.url}
            </div>
        </div>

        ${
			result.content
				? `
        <h3>📄 콘텐츠 미리보기</h3>
        <div class="content-preview">
            ${result.content}
        </div>
        `
				: ''
		}

        <div style="margin-top: 30px; text-align: center;">
            <a href="/scraper/preview?url=${encodeURIComponent(originalUrl)}" 
               style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
               전체 스크래핑 보기
            </a>
            <a href="/api" 
               style="background: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
               Swagger로 돌아가기
            </a>
        </div>
    </div>
</body>
</html>`;
	}

	/**
	 * Renders an error page.
	 * @param url The URL that caused the error.
	 * @param errorMessage The error message.
	 * @returns An HTML string.
	 */
	public createErrorHtml(url: string, errorMessage: string): string {
		return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>오류 발생</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>❌ 오류 발생</h1>
        <p><strong>URL:</strong> ${url}</p>
        <div class="error">
            <strong>오류 메시지:</strong><br>
            ${errorMessage}
        </div>
        <div style="margin-top: 30px; text-align: center;">
            <a href="/api" 
               style="background: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
               Swagger로 돌아가기
            </a>
        </div>
    </div>
</body>
</html>`;
	}
}
