const fs = require('fs');
const path = require('path');
const { convertHttpToYaml } = require('./http-to-yaml');
const { convertCurlToYaml } = require('./curl-to-yaml');

// fs 모듈 모킹
jest.mock('fs');

describe('변환 도구 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HTTP to YAML 변환', () => {
    it('HTTP 요청을 YAML 설정으로 변환', () => {
      const httpContent = `GET https://api.example.com/users
Authorization: Bearer token123
Content-Type: application/json

{
  "filter": "active"
}`;

      const result = convertHttpToYaml(httpContent);
      expect(result).toBeDefined();
      expect(result.apis).toBeDefined();
      expect(result.apis.length).toBe(1);
      expect(result.apis[0].method).toBe('GET');
      expect(result.apis[0].host).toBe('api.example.com');
      expect(result.apis[0].url).toBe('/users');
      expect(result.apis[0].headers).toEqual({
        'Authorization': 'Bearer token123',
        'Content-Type': 'application/json'
      });
    });

    it('여러 HTTP 요청 처리', () => {
      const httpContent = `GET https://api.example.com/users
Authorization: Bearer token123

POST https://api.example.com/users
Content-Type: application/json

{
  "name": "John",
  "email": "john@example.com"
}`;

      const result = convertHttpToYaml(httpContent);
      expect(result).toBeDefined();
      expect(result.apis).toBeDefined();
      expect(result.apis.length).toBe(2);
      
      // 첫 번째 요청 검증
      expect(result.apis[0].method).toBe('GET');
      expect(result.apis[0].host).toBe('api.example.com');
      expect(result.apis[0].url).toBe('/users');
      expect(result.apis[0].headers).toEqual({
        'Authorization': 'Bearer token123'
      });

      // 두 번째 요청 검증
      expect(result.apis[1].method).toBe('POST');
      expect(result.apis[1].host).toBe('api.example.com');
      expect(result.apis[1].url).toBe('/users');
      expect(result.apis[1].headers).toEqual({
        'Content-Type': 'application/json'
      });
      expect(result.apis[1].body).toEqual({
        name: 'John',
        email: 'john@example.com'
      });
    });
  });

  describe('CURL to YAML 변환', () => {
    it('CURL 명령어를 YAML 설정으로 변환', () => {
      const curlContent = `curl -X GET https://api.example.com/users \\
  -H "Authorization: Bearer token123" \\
  -H "Content-Type: application/json"`;

      fs.readFileSync.mockReturnValue(curlContent);

      convertCurlToYaml('test.txt');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.yaml'),
        expect.stringContaining('host: api.example.com')
      );
    });

    it('여러 CURL 명령어 처리', () => {
      const curlContent = `curl -X GET https://api.example.com/users \\
  -H "Authorization: Bearer token123"

curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John","email":"john@example.com"}'`;

      fs.readFileSync.mockReturnValue(curlContent);

      const result = convertCurlToYaml('test.txt');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        host: 'api.example.com',
        url: '/users',
        method: 'GET'
      });
    });
  });
}); 