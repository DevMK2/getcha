const fs = require('fs');
const path = require('path');
const { convertCurlToYaml } = require('../curl-to-yaml');

jest.mock('fs');
jest.mock('path');

describe('curl-to-yaml', () => {
  const testDir = '/test-files';
  const inputFile = '/test-files/test-curl.txt';
  const outputFile = '/test-files/output.yaml';

  beforeEach(() => {
    // Mock 초기화
    jest.clearAllMocks();
    
    // fs.existsSync 모의 구현
    fs.existsSync.mockImplementation((path) => true);
    
    // fs.readFileSync 모의 구현
    fs.readFileSync.mockImplementation((path, encoding) => {
      if (path === inputFile) {
        return `curl -X GET "https://api.example.com/users" -H "Authorization: Bearer token123"
curl -X POST "https://api.example.com/posts" -H "Content-Type: application/json" -d '{"title":"Test","body":"Content"}'`;
      }
      return '';
    });
    
    // fs.writeFileSync 모의 구현
    fs.writeFileSync.mockImplementation(() => {});
  });

  test('curl 명령어를 YAML로 변환', async () => {
    const result = await convertCurlToYaml(inputFile, outputFile);
    
    expect(result.apis).toHaveLength(2);
    expect(result.apis[0]).toMatchObject({
      id: 'api-users',
      name: 'GET /users',
      description: 'GET 요청을 api.example.com에 보냅니다',
      method: 'GET',
      url: 'https://api.example.com/users',
      headers: {
        'Authorization': 'Bearer token123'
      }
    });
    expect(result.apis[1]).toMatchObject({
      id: 'api-posts',
      name: 'POST /posts',
      description: 'POST 요청을 api.example.com에 보냅니다',
      method: 'POST',
      url: 'https://api.example.com/posts',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(fs.writeFileSync).toHaveBeenCalledWith(outputFile, expect.any(String));
  });

  test('잘못된 curl 명령어 처리', async () => {
    fs.readFileSync.mockImplementationOnce(() => 'invalid curl command');
    
    const result = await convertCurlToYaml(inputFile, outputFile);
    expect(result.apis).toHaveLength(0);
  });

  test('존재하지 않는 파일 처리', async () => {
    fs.existsSync.mockImplementationOnce(() => false);
    
    await expect(convertCurlToYaml(inputFile, outputFile))
      .rejects
      .toThrow('ENOENT');
  });

  test('유효한 curl 명령어 변환', async () => {
    const inputFile = path.join(testDir, 'valid-curl.txt');
    const result = await convertCurlToYaml(inputFile, 'output.yaml');
    
    expect(result.apis).toHaveLength(1);
    expect(result.apis[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      method: 'GET',
      url: expect.stringContaining('api.example.com'),
      headers: expect.any(Object),
      mapping: expect.any(Array)
    });
  });

  test('여러 개의 curl 명령어 처리', async () => {
    const inputFile = path.join(testDir, 'multiple-curls.txt');
    const result = await convertCurlToYaml(inputFile, 'output.yaml');
    
    expect(result.apis).toHaveLength(2);
    result.apis.forEach(api => {
      expect(api).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        method: expect.any(String),
        url: expect.any(String),
        headers: expect.any(Object),
        mapping: expect.any(Array)
      });
    });
  });
}); 