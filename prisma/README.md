# Prisma & PostgreSQL 운영 매뉴얼

## 1. 개요

본 문서에서는 Prisma ORM과 PostgreSQL 데이터베이스를 사용하여 **스키마 마이그레이션**을 수행하고, 환경별 DB 반영 절차를 정리한다. 또한 장기적인 유지보수를 위한 권장 사항을 포함한다.

## 2. 시스템 요구 사항

- Node.js 18 이상 (프로젝트는 TypeScript 5 기반)
- PostgreSQL 14 이상
- `pnpm` 혹은 `npm`

## 3. 환경 변수 설정

### 3.1 기본 구조

프로젝트 루트에 `.env.local`, `.env.dev`, `.env.staging`, `.env.prod` 파일을 두고 아래 변수를 선언한다.

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
SHADOW_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/SHADOW_DB?schema=public"
```

> `DATABASE_URL` 이 바뀌면 **Prisma Client** 를 재생성해야 한다.

## 4. npm 스크립트 요약

| 스크립트                         | 설명                                                    |
| -------------------------------- | ------------------------------------------------------- |
| `npm run prisma:generate`        | Prisma Client 재생성                                    |
| `npm run prisma:migrate`         | (기본) 로컬 개발 환경에서 마이그레이션 생성 & 적용      |
| `npm run prisma:migrate:local`   | `.env.local` 을 사용하여 로컬 DB에 마이그레이션 적용    |
| `npm run prisma:migrate:dev`     | `.env.dev` (=공동 개발 DB) 에 마이그레이션 적용         |
| `npm run prisma:migrate:staging` | `.env.staging` 에 마이그레이션 적용                     |
| `npm run prisma:migrate:prod`    | `.env.prod` (=프로덕션) 에 마이그레이션 **deploy** 실행 |
| `npm run prisma:studio`          | 기본 환경 Prisma Studio 실행                            |
| `npm run prisma:studio:local`    | 로컬 DB Prisma Studio 실행                              |
| `npm run prisma:studio:dev`      | dev DB Prisma Studio 실행                               |
| `npm run prisma:studio:staging`  | staging DB Prisma Studio 실행                           |

## 5. 마이그레이션 워크플로우

1. `prisma/schema.prisma` 파일에서 모델을 수정한다.
2. 터미널에서 아래 명령어를 실행해 새 마이그레이션을 생성하고 로컬 DB에 적용한다.

```bash
# 마이그레이션 이름은 소문자-hyphen-case 권장
npm run prisma:migrate -- --name add-user-table
```

> 스크립트 뒤에 옵션을 넘길 때는 `--` 로 구분한다. 예: `npm run prisma:migrate:local -- --name add-user-table`

3. 어플리케이션 테스트(단위/통합)를 실행해 스키마 변경이 정상 동작하는지 확인한다.
4. 변경 사항을 **커밋 & PR** 한다. 머지 후, 다른 개발자는 `git pull` 뒤 `npm run prisma:migrate:dev` 로 공동 개발 DB에 변경을 반영한다.
5. **스테이징 배포** 단계(CI/CD)에서 `npm run prisma:migrate:staging` 을 실행해 스키마를 적용한다.
6. **프로덕션 배포** 전에는 DB 백업 후 `npm run prisma:migrate:prod` 로 안전하게 배포한다.
7. 데이터베이스 반영 후에는 항상 `npm run prisma:generate` 로 Prisma Client 를 재생성한다.

### 5.1 DB push (간단 동기화)

모델과 DB를 강제로 맞추고 싶을 때는 `npx prisma db push` 를 사용할 수 있다. 다만 **마이그레이션 히스토리가 남지 않으므로** 로컬 개발 환경에서만 사용한다.

## 6. Prisma Studio 사용법

```bash
npm run prisma:studio         # 기본 환경
npm run prisma:studio:local   # 로컬 DB
```

브라우저가 자동으로 `http://localhost:5555` 로 열린다.

## 7. PostgreSQL 운영 가이드

### 7.1 백업 & 복구

```bash
# 백업 (압축 포맷)
pg_dump -Fc -d $DB_NAME -h $HOST -U $USER -f backup_$(date +%Y%m%d).dump

# 복구
pg_restore --clean --create -d postgres -h $HOST -U $USER backup_YYYYMMDD.dump
```

- **프로덕션 배포 전** 반드시 최신 백업을 확보한다.
- 장기 보관을 위해 S3 등 오브젝트 스토리지에 업로드한다.

### 7.2 모니터링 & 튜닝

- `pg_stat_activity`, `pg_stat_statements` 뷰로 Slow Query 추적
- 정기적으로 `VACUUM (ANALYZE)` 실행 (RDS 의 경우 자동 설정 가능)
- 디스크 사용량 80% 이상 시 알람 설정

### 7.3 권한 관리

| 역할                               | 권한                                   |
| ---------------------------------- | -------------------------------------- |
| 서비스 계정 (`app_user`)           | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| 마이그레이션 계정 (`migrate_user`) | 위 권한 + DDL (`CREATE`, `ALTER`)      |

## 8. 트러블슈팅

| 증상                                        | 원인                                | 해결                                                                           |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| `Error: P1001: Can't reach database server` | 네트워크 차단, `.env` HOST 오타     | VPN 확인, `.env` 수정                                                          |
| 마이그레이션 충돌                           | 두 명이 동일 마이그레이션 파일 수정 | `git rebase` 로 순서 조정 후 `prisma migrate resolve --applied <migration_id>` |

## 9. 참고 자료

- Prisma 공식 문서: <https://www.prisma.io/docs>
- PostgreSQL 공식 문서: <https://www.postgresql.org/docs/>
