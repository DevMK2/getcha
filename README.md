# API 데이터 수집기

여러 API를 순차적으로 호출하여 데이터를 수집하고 CSV 형식으로 변환하는 도구입니다.

## 주요 기능

- YAML 설정 파일을 통한 API 설정 관리
- 순차적 API 호출
- JSON 응답 데이터에서 원하는 값 추출
- CSV 형식으로 데이터 변환
- curl 명령어를 YAML 설정으로 변환하는 도구 포함

## 설치

```bash
npm install
```

## 설정

### API 설정 (config.yaml)

```yaml
apis:
  - name: "사용자 목록"
    host: "api.example.com"
    url: "/users"
    method: "GET"
    parameters:
      limit: 10
    headers:
      Authorization: "Bearer token123"
    mapping:
      - source: "data[*].id"
        target: "user_id"
      - source: "data[*].name"
        target: "user_name"
```

### curl 명령어를 YAML로 변환

curl 명령어를 YAML 설정으로 변환하려면 다음 명령어를 사용하세요:

```bash
node tools/curl-to-yaml.js <입력_파일> [출력_파일]
```

예시:
```bash
node tools/curl-to-yaml.js tools/test-curl.txt config.yaml
```

## 사용법

### 기본 실행
```bash
node src/index.js
```

### 테스트 실행
```bash
npm test
```

테스트는 다음 항목들을 검증합니다:
- API 호출 파라미터 정확성
- 응답 데이터 매핑 정확성
- 에러 처리
- 설정 파일 로드

## 출력 예시

```csv
user_id,user_name
1,홍길동
2,김철수
```

## 주의사항

- API 호출은 순차적으로 이루어집니다
- 각 API 응답은 JSON 형식이어야 합니다
- mapping 설정의 source는 JSONPath 형식을 따릅니다
- 에러 발생 시 자세한 에러 메시지가 출력됩니다

## 의존성

- axios: HTTP 요청 처리
- js-yaml: YAML 설정 파일 처리
- jest: 테스트 프레임워크 (개발 의존성)

## 주요 기능

- YAML 설정 파일을 통한 API 설정
- 순차적 API 호출
- JSON 응답 데이터를 CSV로 변환
- 오류 처리 및 로깅

## 설치 방법

```bash
# 저장소 클론
git clone https://github.com/DevMK2/getcha.git

# 프로젝트 디렉토리로 이동
cd getcha

# 의존성 설치
npm install
```

## 설정 방법

`config.yaml` 파일에서 API 설정을 관리합니다. 각 API에 대해 다음 정보를 설정할 수 있습니다:

```yaml
apis:
  - host: api.example.com
    url: /data
    method: GET
    parameters:
      key: value
    headers:
      Authorization: "Bearer token"
    mapping:
      - header: "Name"
        path: "user.name"
      - header: "Age"
        path: "user.age"
```

### 설정 항목 설명

- `host`: API 서버 주소
- `url`: API 엔드포인트
- `method`: HTTP 메소드 (기본값: GET)
- `parameters`: 쿼리 파라미터
- `headers`: HTTP 헤더 (인증 정보 포함)
- `mapping`: JSON 응답 데이터와 CSV 컬럼 매핑

## 실행 방법

```bash
npm start
```

실행하면 `output.csv` 파일이 생성됩니다.

## HTTP 요청을 YAML 설정으로 변환

`tools` 디렉토리에 있는 http-to-yaml 도구를 사용하여 HTTP 요청을 YAML 설정으로 변환할 수 있습니다.
이 도구는 Postman에서 사용하는 HTTP 텍스트 형식과 호환됩니다.

### 사용 방법

```bash
# tools 디렉토리로 이동
cd tools

# HTTP 요청 파일을 YAML 설정으로 변환
node http-to-yaml.js example-http.txt
```

### 입력 파일 형식

```http
GET https://api.example.com/users?limit=10
Authorization: Bearer token123
Content-Type: application/json

POST https://api.example.com/orders
Content-Type: application/json
Authorization: Bearer token123

{
    "userId": "123",
    "items": ["item1", "item2"]
}
```

### 백업 기능

- 변환 시 기존 `config.yaml` 파일이 존재하는 경우, 자동으로 `config_backup` 디렉토리에 `config.backup.{UUID}.yaml` 형식으로 백업됩니다.
- UUID는 자동으로 생성되며, 각 백업 파일은 고유한 식별자를 가집니다.
- 백업 파일은 프로젝트 루트의 `config_backup` 디렉토리에 저장됩니다.

## 로그

- `error.log`: 오류 로그
- `combined.log`: 전체 로그

## 의존성

- axios: HTTP 클라이언트
- js-yaml: YAML 파서
- winston: 로깅
- uuid: 고유 식별자 생성

## 라이선스

MIT License 