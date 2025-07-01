import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name);
	private readonly logFormat = '[%s] %s - %d - %dms';

	private getNow(): number {
		if (typeof process.hrtime?.bigint === 'function') {
			return Number(process.hrtime.bigint()) / 1_000_000;
		}
		return Date.now();
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const req = context.switchToHttp().getRequest<Request>();
		const res = context.switchToHttp().getResponse<Response>();
		const { method, url } = req;
		const startTime = this.getNow();
		const clientIp = this.getClientIp(req);

		// 요청 시작 로그 (비동기)
		setImmediate(() => {
			this.logger.log(`${method} ${url} - ${clientIp}`);
		});

		return next.handle().pipe(
			tap(() => {
				setImmediate(() => {
					const endTime = this.getNow();
					const responseTime = endTime - startTime;
					const statusCode = res.statusCode;
					if (statusCode >= 400 || responseTime > 1000) {
						this.logger.warn(this.logFormat, method, url, statusCode, responseTime);
					} else {
						this.logger.log(`${method} ${url} - ${statusCode}`);
					}
				});
			}),
			catchError((err: unknown) => {
				const endTime = this.getNow();
				const responseTime = endTime - startTime;
				const statusCode = res.statusCode || 500;
				this.logger.error(this.logFormat, method, url, statusCode, responseTime);
				if (err instanceof Error) {
					this.logger.error(`${method} ${url} - ${err.message}`);
				}
				return throwError(() => err);
			}),
		);
	}

	private getClientIp(req: Request): string {
		return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
	}
}
