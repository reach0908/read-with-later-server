import { Module } from '@nestjs/common';
import { ContentsController } from 'src/modules/contents/contents.controller';
import { ContentsService } from 'src/modules/contents/contents.service';
import { ContentsRepository } from 'src/modules/contents/repositories/contents.repository';

@Module({
	controllers: [ContentsController],
	providers: [ContentsService, ContentsRepository],
})
export class ContentsModule {}
