#!/bin/bash

# Docker 개발 환경 관리 스크립트

case "$1" in
  "up")
    echo "🚀 Docker 개발 환경을 시작합니다..."
    docker-compose up -d
    echo "✅ 서비스가 시작되었습니다!"
    echo "🗄️  PostgreSQL: localhost:5432 (postgres/postgres123)"
    echo "🔧 Redis: localhost:6379 (password: redis123)"
    ;;
  "down")
    echo "🛑 Docker 개발 환경을 중지합니다..."
    docker-compose down
    echo "✅ 모든 서비스가 중지되었습니다!"
    ;;
  "logs")
    if [ -z "$2" ]; then
      echo "📋 모든 서비스의 로그를 확인합니다..."
      docker-compose logs -f
    else
      echo "📋 $2 서비스의 로그를 확인합니다..."
      docker-compose logs -f "$2"
    fi
    ;;
  "reset")
    echo "🔄 Docker 환경을 초기화합니다... (모든 데이터가 삭제됩니다!)"
    read -p "정말 진행하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      docker-compose up -d
      echo "✅ 환경이 초기화되었습니다!"
    else
      echo "❌ 취소되었습니다."
    fi
    ;;
  "status")
    echo "📊 Docker 컨테이너 상태:"
    docker-compose ps
    ;;
  "psql")
    echo "🗄️  PostgreSQL에 연결합니다..."
    docker exec -it postgres_db psql -U postgres -d read_with_later
    ;;
  "redis")
    echo "🔧 Redis CLI에 연결합니다..."
    docker exec -it redis_server redis-cli -a redis123
    ;;
  "postgres-bash")
    echo "🐧 PostgreSQL 컨테이너 bash에 접속합니다..."
    docker exec -it postgres_db bash
    ;;
  "redis-bash")
    echo "🐧 Redis 컨테이너 bash에 접속합니다..."
    docker exec -it redis_server sh
    ;;
  *)
    echo "사용법: $0 {up|down|logs|reset|status|psql|redis|postgres-bash|redis-bash}"
    echo ""
    echo "  up           - 개발 환경 시작"
    echo "  down         - 개발 환경 중지"
    echo "  logs [서비스] - 로그 보기 (특정 서비스 지정 가능)"
    echo "  reset        - 환경 초기화 (데이터 삭제)"
    echo "  status       - 컨테이너 상태 확인"
    echo "  psql         - PostgreSQL CLI 접속"
    echo "  redis        - Redis CLI 접속"
    echo "  postgres-bash - PostgreSQL 컨테이너 bash 접속"
    echo "  redis-bash   - Redis 컨테이너 bash 접속"
    ;;
esac 