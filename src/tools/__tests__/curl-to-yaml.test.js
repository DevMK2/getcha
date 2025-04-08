const fs = require('fs');
const path = require('path');
const { convertCurlToYaml } = require('../curl-to-yaml');

describe('curl-to-yaml', () => {
  const testDir = path.join(__dirname, 'test-files');
  const inputFile = path.join(testDir, 'test-curl.txt');
  const outputFile = path.join(testDir, 'output.yaml');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  beforeEach(() => {
    const testContent = `curl -X GET "https://api.example.com/users" -H "Authorization: Bearer token123"
curl -X POST "https://api.example.com/posts" -H "Content-Type: application/json" -d '{"title":"Test","body":"Content"}'`;
    fs.writeFileSync(inputFile, testContent);
  });

  afterEach(() => {
    if (fs.existsSync(inputFile)) {
      fs.unlinkSync(inputFile);
    }
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

    const yamlContent = fs.readFileSync(outputFile, 'utf8');
    expect(yamlContent).toContain('apis:');
    expect(yamlContent).toContain('id: api-users');
    expect(yamlContent).toContain('id: api-posts');
  });

  test('잘못된 curl 명령어 처리', async () => {
    fs.writeFileSync(inputFile, 'invalid curl command');
    
    const result = await convertCurlToYaml(inputFile, outputFile);
    expect(result.apis).toHaveLength(0);
  });

  test('존재하지 않는 파일 처리', async () => {
    const nonexistentFile = path.join(testDir, 'nonexistent.txt');
    await expect(convertCurlToYaml(nonexistentFile, 'output.yaml'))
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