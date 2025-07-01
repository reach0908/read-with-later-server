import { Injectable } from '@nestjs/common';
import { ContentsRepository } from 'src/modules/contents/repositories/contents.repository';

@Injectable()
export class ContentsService {
	constructor(private readonly contentsRepository: ContentsRepository) {}
}
