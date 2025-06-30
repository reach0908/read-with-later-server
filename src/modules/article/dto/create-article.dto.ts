import { IsUrl, IsNotEmpty } from 'class-validator';

export class CreateArticleDto {
	@IsUrl({}, { message: '유효한 URL을 입력해주세요' })
	@IsNotEmpty({ message: 'URL은 필수입니다' })
	url: string;
}
