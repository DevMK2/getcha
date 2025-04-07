# Getcha - API to CSV 변환기

여러 API를 순차적으로 호출하여 받은 데이터를 CSV 형식으로 변환하는 도구입니다.

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

## 라이선스

MIT License 