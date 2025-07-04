import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name);

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

		// 요청 시작 로그
		this.logger.log(`${method} ${url} - ${clientIp}`);

		return next.handle().pipe(
			tap(() => {
				const endTime = this.getNow();
				const responseTime = endTime - startTime;
				const statusCode = res.statusCode;
				const logMessage = `${method} ${url} - ${statusCode} - ${responseTime.toFixed(2)}ms`;

				if (statusCode >= 400 || responseTime > 1000) {
					this.logger.warn(logMessage);
				} else {
					this.logger.log(logMessage);
				}
			}),
			catchError((err: unknown) => {
				const endTime = this.getNow();
				const responseTime = endTime - startTime;
				const statusCode = res.statusCode || 500;
				const logMessage = `${method} ${url} - ${statusCode} - ${responseTime.toFixed(2)}ms`;

				this.logger.error(logMessage);
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
