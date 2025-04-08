# Getcha

API 호출 결과를 CSV 파일로 변환하는 Node.js 애플리케이션입니다.

## 기능

- YAML 설정 파일을 통한 API 호출 정의
- 여러 API 엔드포인트에 대한 순차적 호출
- 응답 데이터의 필드 매핑 지원
- CSV 형식으로 데이터 변환 및 저장

## 설치

```bash
npm install
```

## 사용법

1. `config.yaml` 파일을 생성하고 API 호출 설정을 정의합니다:

```yaml
apis:
  - id: example-api
    name: Example API
    method: GET
    url: https://api.example.com/endpoint
    headers:
      Content-Type: application/json
    mapping:
      - from: id
        to: ID
      - from: title
        to: 제목
```

2. 프로그램 실행:

```bash
npm start [config-file]
```

- `config-file`: 설정 파일 경로 (기본값: config.yaml)

## 설정 파일 형식

### API 설정

```yaml
apis:
  - id: string          # API 호출 고유 ID
    name: string        # API 호출 이름
    description: string # API 호출 설명
    method: string      # HTTP 메서드 (GET, POST, PUT, DELETE 등)
    url: string         # API 엔드포인트 URL
    headers: object     # HTTP 헤더
    body: object        # 요청 본문 (POST, PUT 등에서 사용)
    mapping: array      # 응답 데이터 매핑 설정
      - from: string    # 원본 필드명
        to: string      # 변환될 필드명
```

### 매핑 설정

응답 데이터의 필드를 원하는 형식으로 변환할 수 있습니다:

```yaml
mapping:
  - from: id
    to: ID
  - from: title
    to: 제목
  - from: content
    to: 내용
```

## 출력

- 변환된 데이터는 `output.csv` 파일로 저장됩니다.
- 기본 출력 파일명은 설정 파일의 `output` 필드에서 변경할 수 있습니다.

## 로깅

- 모든 작업은 로그 파일에 기록됩니다.
- 오류 발생 시 상세한 오류 정보가 로그에 기록됩니다.

## 라이선스

MIT 