import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * 애플리케이션 헬스 체크 컨트롤러
 */
@ApiTags('health')
@Controller()
export class HealthController {
	@ApiOperation({ summary: '헬스 체크' })
	@Get()
	health() {
		return { status: 'ok' };
	}
}
