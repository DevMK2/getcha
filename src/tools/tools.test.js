const fs = require('fs');
const path = require('path');
const { convertHttpToYaml } = require('./http-to-yaml');
const { convertCurlToYaml } = require('./curl-to-yaml');

// fs 모듈 모킹
jest.mock('fs');

describe('변환 도구 테스트', () => {
  beforeEach(() => {
    // 각 테스트 전에 fs 모킹 초기화
    fs.readFileSync.mockClear();
    fs.writeFileSync.mockClear();
    fs.existsSync.mockClear();
    fs.mkdirSync.mockClear();
    fs.copyFileSync.mockClear();
  });

  describe('HTTP to YAML 변환', () => {
    test('HTTP 요청을 YAML 설정으로 변환', () => {
      const httpContent = `GET https://api.example.com/users?limit=10
Authorization: Bearer token123
Content-Type: application/json

{
  "filter": "active"
}`;

      fs.readFileSync.mockReturnValue(httpContent);
      fs.existsSync.mockReturnValue(true);

      const result = convertHttpToYaml('example-http.txt');

      // YAML 파일 저장 검증
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.yaml'),
        expect.stringContaining('host: api.example.com')
      );

      // 결과 검증
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        host: 'api.example.com',
        url: '/users',
        method: 'GET',
        parameters: { limit: '10' }
      });
    });

    test('여러 HTTP 요청 처리', () => {
      const httpContent = `GET https://api.example.com/users
Authorization: Bearer token123

POST https://api.example.com/users
Content-Type: application/json

{
  "name": "John",
  "email": "john@example.com"
}`;

      fs.readFileSync.mockReturnValue(httpContent);
      fs.existsSync.mockReturnValue(true);

      const result = convertHttpToYaml('example-http.txt');

      // 두 개의 API 설정이 생성되었는지 확인
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        host: 'api.example.com',
        url: '/users',
        method: 'GET'
      });
      expect(result[1]).toMatchObject({
        host: 'api.example.com',
        url: '/users',
        method: 'POST',
        body: {
          name: 'John',
          email: 'john@example.com'
        }
      });
    });
  });

  describe('CURL to YAML 변환', () => {
    test('CURL 명령어를 YAML 설정으로 변환', () => {
      const curlContent = `curl -X POST https://api.example.com/users \\
  -H "Authorization: Bearer token123" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John","email":"john@example.com"}'`;

      fs.readFileSync.mockReturnValue(curlContent);
      fs.existsSync.mockReturnValue(true);

      convertCurlToYaml('example-curl.txt');

      // YAML 파일 저장 검증
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.yaml'),
        expect.stringContaining('host: api.example.com')
      );
    });

    test('여러 CURL 명령어 처리', () => {
      const curlContent = `curl https://api.example.com/users \\
  -H "Authorization: Bearer token123"

curl -X POST https://api.example.com/users \\
  -H "Authorization: Bearer token123" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John","email":"john@example.com"}'`;

      fs.readFileSync.mockReturnValue(curlContent);
      fs.existsSync.mockReturnValue(true);

      convertCurlToYaml('example-curl.txt');

      // 두 개의 API 설정이 생성되었는지 확인
      const yamlContent = fs.writeFileSync.mock.calls[0][1];
      expect(yamlContent).toContain('apis:');
      expect(yamlContent.match(/host:/g)).toHaveLength(2);
    });
  });
}); 