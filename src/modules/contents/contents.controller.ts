import { Controller } from '@nestjs/common';
import { ContentsService } from 'src/modules/contents/contents.service';

@Controller('contents')
export class ContentsController {
	constructor(private readonly contentsService: ContentsService) {}
}
