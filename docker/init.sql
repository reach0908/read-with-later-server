-- 초기 데이터베이스 설정
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 스크래핑 상태를 나타내는 열거형 타입 생성
CREATE TYPE article_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- 개발용 기본 설정
ALTER DATABASE read_with_later SET timezone TO 'Asia/Seoul'; 