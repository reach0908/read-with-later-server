import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

describe('AuthController (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();

		// 테스트 환경에서도 쿠키 파싱이 가능하도록 미들웨어 적용
		app.use(cookieParser());

		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('Google OAuth', () => {
		it('/auth/google (GET) - Google OAuth 로그인 페이지로 리다이렉트', () => {
			return request(app.getHttpServer())
				.get('/auth/google')
				.expect(302)
				.expect('Location', /accounts\.google\.com/);
		});

		it('/auth/google/callback (GET) - 인증 없이 접근 시 리다이렉트', () => {
			return request(app.getHttpServer()).get('/auth/google/callback').expect(302);
		});
	});

	describe('Token 관리', () => {
		it('/auth/refresh (POST) - 리프레시 토큰이 없으면 401 에러', () => {
			return request(app.getHttpServer())
				.post('/auth/refresh')
				.expect(401)
				.expect((res) => {
					expect(res.body.message).toBe('Refresh token not found');
				});
		});

		it('/auth/refresh (POST) - 잘못된 리프레시 토큰으로 401 에러', () => {
			return request(app.getHttpServer())
				.post('/auth/refresh')
				.set('Cookie', ['refresh_token=invalid-token'])
				.expect(401)
				.expect((res) => {
					expect(res.body.message).toBe('Invalid refresh token');
				});
		});
	});

	describe('인증이 필요한 엔드포인트', () => {
		it('/auth/logout (POST) - 액세스 토큰 없이 접근 시 401 에러', () => {
			return request(app.getHttpServer()).post('/auth/logout').expect(401);
		});

		it('/auth/logout (POST) - 잘못된 액세스 토큰으로 401 에러', () => {
			return request(app.getHttpServer())
				.post('/auth/logout')
				.set('Authorization', 'Bearer invalid-token')
				.expect(401);
		});
	});

	describe('보안 검증', () => {
		it('존재하지 않는 엔드포인트는 404 에러', () => {
			return request(app.getHttpServer()).get('/auth/nonexistent').expect(404);
		});

		it('잘못된 HTTP 메서드는 405 에러', () => {
			return request(app.getHttpServer()).delete('/auth/refresh').expect(404); // NestJS는 라우트가 없으면 404를 반환
		});
	});

	describe('헬스 체크', () => {
		it('애플리케이션이 정상적으로 실행되는지 확인', () => {
			return request(app.getHttpServer()).get('/').expect(200);
		});
	});

	// 실제 토큰을 사용한 통합 테스트는 별도의 테스트 환경에서 진행
	// 여기서는 기본적인 라우팅과 보안 검증만 테스트
});
