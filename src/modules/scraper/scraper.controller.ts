import {
	Controller,
	Post,
	Body,
	Get,
	Query,
	BadRequestException,
	Res,
	Header,
	UseGuards,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { Response } from 'express';
import { AuthRequest } from 'src/types';
import { PuppeteerParseService, FetchContentWithSaveInput } from './services/puppeteer-parse.service';
import { FetchContentInput } from './dto/fetch-content.input';
import { ScrapedContentOutput } from './dto/scraped-content.output';
import { PreHandlerService } from '../pre-handler/pre-handler.service';
import { PreHandleResult } from '../pre-handler/dto/pre-handle-result.dto';

@ApiTags('scraper')
@Controller('scraper')
export class ScraperController {
	constructor(
		private readonly puppeteerParseService: PuppeteerParseService,
		private readonly preHandlerService: PreHandlerService,
	) {}

	/**
	 * 전체 스크래핑 프로세스 (사전 처리 + Puppeteer)
	 */
	@Post('fetch-content')
	@ApiOperation({
		summary: '웹 콘텐츠 스크래핑',
		description: '사전 처리 핸들러들을 거쳐 최종적으로 웹 콘텐츠를 스크래핑합니다.',
	})
	@ApiBody({ type: FetchContentInput })
	@ApiResponse({
		status: 200,
		description: '스크래핑 성공',
		schema: {
			type: 'object',
			properties: {
				finalUrl: { type: 'string' },
				title: { type: 'string' },
				content: { type: 'string' },
				contentType: { type: 'string' },
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: '잘못된 URL 또는 요청',
	})
	@ApiResponse({
		status: 500,
		description: '서버 오류',
	})
	async fetchContent(@Body() input: FetchContentInput): Promise<ScrapedContentOutput> {
		return this.puppeteerParseService.fetchContent(input);
	}

	/**
	 * 웹 콘텐츠 스크래핑 및 저장 (인증 필요)
	 */
	@Post('save-content')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth('access-token')
	@ApiOperation({
		summary: '웹 콘텐츠 스크래핑 및 저장',
		description: '웹 콘텐츠를 스크래핑하고 사용자 계정에 저장합니다. 인증이 필요합니다.',
	})
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				url: { type: 'string', description: '스크래핑할 URL' },
				locale: { type: 'string', description: '언어 설정 (선택사항)' },
				timezone: { type: 'string', description: '시간대 설정 (선택사항)' },
				tags: { type: 'array', items: { type: 'string' }, description: '태그 목록 (선택사항)' },
				isBookmarked: { type: 'boolean', description: '북마크 여부 (선택사항)' },
				isArchived: { type: 'boolean', description: '아카이브 여부 (선택사항)' },
			},
			required: ['url'],
		},
	})
	@ApiResponse({
		status: 200,
		description: '스크래핑 및 저장 성공',
		schema: {
			type: 'object',
			properties: {
				finalUrl: { type: 'string' },
				title: { type: 'string' },
				content: { type: 'string' },
				contentType: { type: 'string' },
				saved: { type: 'boolean', description: '데이터베이스 저장 여부' },
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: '잘못된 URL 또는 요청',
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	@ApiResponse({
		status: 500,
		description: '서버 오류',
	})
	async saveContent(
		@Request() req: AuthRequest,
		@Body() input: Record<string, any>,
	): Promise<ScrapedContentOutput & { saved: boolean }> {
		// URL 필수 필드 검증
		if (!input.url) {
			throw new BadRequestException('URL is required');
		}

		// 인증된 사용자 정보 사용
		const fetchInput: FetchContentWithSaveInput = {
			url: input.url as string,
			locale: input.locale as string | undefined,
			timezone: input.timezone as string | undefined,
			tags: input.tags as string[] | undefined,
			isBookmarked: input.isBookmarked as boolean | undefined,
			isArchived: input.isArchived as boolean | undefined,
			saveToDatabase: true, // 저장 활성화
			userId: req.user.id, // 인증된 사용자 ID 사용
		};

		const result = await this.puppeteerParseService.fetchContentWithSave(fetchInput);
		return { ...result, saved: true };
	}

	/**
	 * 사전 처리만 테스트 (핸들러 체인 테스트용)
	 */
	@Get('pre-handle')
	@ApiOperation({
		summary: '사전 처리 핸들러 테스트',
		description:
			'URL이 어떤 핸들러에 의해 어떻게 변환되는지 테스트합니다. Puppeteer를 사용하지 않고 사전 처리만 수행합니다.',
	})
	@ApiQuery({
		name: 'url',
		description: '테스트할 URL',
		example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	})
	@ApiResponse({
		status: 200,
		description: '사전 처리 성공',
		schema: {
			type: 'object',
			properties: {
				originalUrl: { type: 'string', description: '원본 URL' },
				finalUrl: { type: 'string', description: '변환된 URL' },
				title: { type: 'string', description: '추출된 제목' },
				contentType: { type: 'string', description: '콘텐츠 타입' },
				contentLength: { type: 'number', description: '콘텐츠 길이' },
				handlerUsed: { type: 'string', description: '사용된 핸들러 정보' },
			},
		},
	})
	async preHandle(@Query('url') url: string) {
		if (!url) {
			throw new BadRequestException('URL is required');
		}

		const result = await this.preHandlerService.execute(url);

		return {
			originalUrl: url,
			finalUrl: result.url,
			title: result.title,
			contentType: result.contentType,
			contentLength: result.content?.length || 0,
			handlerUsed: this.determineHandlerUsed(url, result),
			urlChanged: result.url !== url,
			hasContent: !!result.content,
			hasTitle: !!result.title,
		};
	}

	/**
	 * 핸들러 테스트용 샘플 URL 목록 제공
	 */
	@Get('sample-urls')
	@ApiOperation({
		summary: '테스트용 샘플 URL 목록',
		description: '각 핸들러를 테스트할 수 있는 샘플 URL들을 제공합니다.',
	})
	@ApiResponse({
		status: 200,
		description: '샘플 URL 목록',
		schema: {
			type: 'object',
			properties: {
				categories: {
					type: 'object',
					additionalProperties: {
						type: 'array',
						items: { type: 'string' },
					},
				},
			},
		},
	})
	getSampleUrls() {
		return {
			categories: {
				'PDF 파일': ['https://arxiv.org/pdf/2301.00001.pdf', 'https://example.com/document.pdf'],
				'RSS 피드': ['https://feeds.feedburner.com/TechCrunch', 'https://rss.cnn.com/rss/edition.rss'],
				YouTube: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ'],
				'소셜 미디어': [
					'https://twitter.com/elonmusk/status/1234567890',
					'https://x.com/elonmusk/status/1234567890',
					'https://www.instagram.com/p/ABC123/',
					'https://www.tiktok.com/@user/video/1234567890',
					'https://www.facebook.com/post/123456789',
					'https://www.linkedin.com/posts/user_activity-123456789',
				],
				'뉴스 사이트': [
					'https://www.nytimes.com/2024/01/01/technology/ai-breakthrough.html',
					'https://www.washingtonpost.com/technology/2024/01/01/tech-news/',
					'https://www.cnn.com/2024/01/01/tech/ai-news/index.html',
					'https://www.bbc.com/news/technology-12345678',
					'https://www.reuters.com/technology/ai-breakthrough-2024-01-01/',
				],
				'도메인 특화': [
					'https://medium.com/@author/article-title-123',
					'https://substack.com/p/article-title',
					'https://github.com/user/repo/blob/main/README.md',
					'https://en.wikipedia.org/wiki/Artificial_Intelligence',
					'https://stackoverflow.com/questions/123456/how-to-code',
				],
				'일반 웹사이트': ['https://example.com/article', 'https://blog.example.com/post/123'],
			},
		};
	}

	/**
	 * 스크래핑된 콘텐츠를 HTML로 렌더링해서 브라우저에서 볼 수 있게 함
	 */
	@Get('preview')
	@ApiOperation({
		summary: '스크래핑 콘텐츠 미리보기',
		description: '스크래핑된 콘텐츠를 HTML 형태로 렌더링하여 브라우저에서 직접 볼 수 있습니다.',
	})
	@ApiQuery({
		name: 'url',
		description: '스크래핑할 URL',
		example: 'https://example.com/article',
	})
	@ApiQuery({
		name: 'mode',
		description: '미리보기 모드 (content: 콘텐츠만, full: 전체 결과)',
		enum: ['content', 'full'],
		required: false,
		example: 'content',
	})
	@Header('Content-Type', 'text/html; charset=utf-8')
	async previewContent(@Query('url') url: string, @Query('mode') mode: string = 'content', @Res() res: Response) {
		if (!url) {
			throw new BadRequestException('URL is required');
		}

		try {
			const result = await this.puppeteerParseService.fetchContent({ url });

			if (mode === 'content' && result.content) {
				// 콘텐츠만 보여주기
				const html = this.wrapContentInHtml(result.content, result.title, result.finalUrl);
				res.send(html);
			} else {
				// 전체 결과를 JSON 형태로 보여주기
				const html = this.createResultViewHtml(result, url);
				res.send(html);
			}
		} catch (error) {
			const errorHtml = this.createErrorHtml(url, (error as Error).message);
			res.status(500).send(errorHtml);
		}
	}

	/**
	 * 사전 처리 결과를 HTML로 미리보기
	 */
	@Get('preview-prehandle')
	@ApiOperation({
		summary: '사전 처리 결과 미리보기',
		description: '사전 처리 핸들러들의 결과를 HTML 형태로 보여줍니다.',
	})
	@ApiQuery({
		name: 'url',
		description: '테스트할 URL',
		example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	})
	@Header('Content-Type', 'text/html; charset=utf-8')
	async previewPreHandle(@Query('url') url: string, @Res() res: Response) {
		if (!url) {
			throw new BadRequestException('URL is required');
		}

		try {
			const result = await this.preHandlerService.execute(url);
			const handlerUsed = this.determineHandlerUsed(url, result);

			const html = this.createPreHandleViewHtml(url, result, handlerUsed);
			res.send(html);
		} catch (error) {
			const errorHtml = this.createErrorHtml(url, (error as Error).message);
			res.status(500).send(errorHtml);
		}
	}

	/**
	 * 어떤 핸들러가 사용되었는지 추정하는 헬퍼 메서드
	 */
	private determineHandlerUsed(originalUrl: string, result: PreHandleResult): string {
		const url = new URL(originalUrl);

		// PDF 핸들러
		if (url.pathname.toLowerCase().endsWith('.pdf')) {
			return 'PdfHandler';
		}

		// RSS 핸들러
		if (url.pathname.includes('rss') || url.pathname.includes('feed') || url.pathname.includes('atom')) {
			return 'RssHandler';
		}

		// YouTube 핸들러
		if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
			return 'YoutubeHandler';
		}

		// 소셜 미디어 핸들러
		const socialMediaDomains = [
			'twitter.com',
			'x.com',
			'instagram.com',
			'tiktok.com',
			'facebook.com',
			'linkedin.com',
		];
		if (socialMediaDomains.some((domain) => url.hostname.includes(domain))) {
			return 'SocialMediaHandler';
		}

		// 뉴스 사이트 핸들러
		const newsDomains = ['nytimes.com', 'washingtonpost.com', 'cnn.com', 'bbc.com', 'reuters.com'];
		if (newsDomains.some((domain) => url.hostname.includes(domain))) {
			return 'NewsSiteHandler';
		}

		// 도메인 특화 핸들러
		const domainSpecificDomains = [
			'medium.com',
			'substack.com',
			'github.com',
			'wikipedia.org',
			'stackoverflow.com',
		];
		if (domainSpecificDomains.some((domain) => url.hostname.includes(domain))) {
			return 'DomainSpecificHandler';
		}

		// 기본값
		return result.content ? 'ReadabilityHandler' : 'No handler matched';
	}

	/**
	 * 콘텐츠를 HTML로 래핑하는 헬퍼 메서드
	 */
	private wrapContentInHtml(content: string, title?: string, sourceUrl?: string): string {
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
	 * 전체 스크래핑 결과를 보여주는 HTML 생성
	 */
	private createResultViewHtml(result: ScrapedContentOutput, originalUrl: string): string {
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
                ⚠️ URL이 변경되었습니다: 사전 처리 핸들러에 의해 URL이 최적화되었습니다.
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
	 * 사전 처리 결과를 HTML로 미리보기
	 */
	private createPreHandleViewHtml(originalUrl: string, result: PreHandleResult, handlerUsed: string): string {
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
	 * 오류 HTML 생성
	 */
	private createErrorHtml(url: string, errorMessage: string): string {
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
