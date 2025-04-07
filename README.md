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

## 변환 도구 사용하기

`src/tools` 디렉토리에는 HTTP 요청을 YAML 설정으로 변환하는 도구들이 있습니다:

### curl 명령어를 YAML로 변환

```bash
npm run convert:curl <입력_파일>
```

예시:
```bash
npm run convert:curl example-curl.txt
```

### HTTP 요청을 YAML로 변환

```bash
npm run convert:http <입력_파일>
```

예시:
```bash
npm run convert:http example-http.txt
```

### 테스트

변환 도구의 정확성은 자동화된 테스트로 검증됩니다:

```bash
npm test
```

`src/tools/tools.test.js`에서 다음 항목들을 검증합니다:
- curl 명령어 파싱
- HTTP 요청 형식 파싱
- YAML 변환 정확성
- 에러 처리

## 사용법

### 기본 실행
```bash
npm start
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

## 프로젝트 구조

```
src/
  ├── config/          # 설정 관련 모듈
  │   └── apiResults.js
  ├── services/        # 핵심 서비스 모듈
  │   ├── apiService.js
  │   ├── mappingService.js
  │   └── templateService.js
  ├── utils/          # 유틸리티 모듈
  │   ├── logger.js
  │   └── pathUtils.js
  ├── tools/          # 변환 도구
  │   ├── curl-to-yaml.js
  │   ├── http-to-yaml.js
  │   └── tools.test.js
  └── index.js        # 메인 엔트리 포인트
```

## 고급 기능

### 템플릿 변수

API 설정에서 이전 API 응답의 데이터를 참조할 수 있습니다:

```yaml
apis:
  - id: "users-api"
    host: "api.example.com"
    url: "/users"
    method: "GET"
    
  - id: "user-details"
    host: "api.example.com"
    url: "/users/{{users-api.data.id}}/details"
    parameters:
      role: "{{users-api.data.role}}"
    previousApiId: "users-api"
```

### API 의존성

`previousApiId`를 설정하여 이전 API 응답 데이터를 기반으로 여러 요청을 실행할 수 있습니다:

```yaml
apis:
  - id: "departments"
    host: "api.example.com"
    url: "/departments"
    
  - id: "department-users"
    host: "api.example.com"
    url: "/departments/{{departments.data.id}}/users"
    previousApiId: "departments"
``` 