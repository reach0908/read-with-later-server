import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name);

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const req = context.switchToHttp().getRequest<Request>();
		const { method, url } = req;

		return next.handle().pipe(
			catchError((err: unknown) => {
				if (err instanceof Error) {
					this.logger.error(`[${method}] ${url} - ${err.message}`, err.stack);
				} else {
					this.logger.error(`[${method}] ${url} - ${JSON.stringify(err)}`);
				}
				return throwError(() => err);
			}),
		);
	}
}
