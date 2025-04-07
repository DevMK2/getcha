const axios = require('axios');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { processApi } = require('./index');

// axios 모킹
jest.mock('axios');

describe('API 데이터 수집기 테스트', () => {
  let mockConfig;
  let mockResponse;

  beforeEach(() => {
    // 테스트용 설정
    mockConfig = {
      apis: [
        {
          name: "테스트 API",
          host: "api.example.com",
          url: "/test",
          method: "GET",
          parameters: { limit: 10 },
          headers: { Authorization: "Bearer test-token" },
          mapping: [
            { source: "data[*].id", target: "id" },
            { source: "data[*].name", target: "name" }
          ]
        }
      ]
    };

    // 테스트용 응답 데이터
    mockResponse = {
      data: {
        data: [
          { id: 1, name: "테스트1" },
          { id: 2, name: "테스트2" }
        ]
      }
    };

    // axios 모킹 설정
    axios.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('API 호출이 올바른 파라미터로 이루어지는지 확인', async () => {
    await processApi(mockConfig.apis[0]);

    expect(axios).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://api.example.com/test',
      params: { limit: 10 },
      headers: { Authorization: 'Bearer test-token' }
    });
  });

  test('응답 데이터가 올바르게 매핑되는지 확인', async () => {
    const result = await processApi(mockConfig.apis[0]);

    expect(result).toEqual([
      { id: 1, name: "테스트1" },
      { id: 2, name: "테스트2" }
    ]);
  });

  test('에러 처리가 올바르게 되는지 확인', async () => {
    const error = new Error('API 호출 실패');
    axios.mockRejectedValue(error);

    await expect(processApi(mockConfig.apis[0])).rejects.toThrow('API 호출 실패');
  });

  test('config.yaml 파일이 올바르게 로드되는지 확인', () => {
    const config = yaml.load(fs.readFileSync(path.join(__dirname, '../config.yaml'), 'utf8'));
    expect(config).toBeDefined();
    expect(config.apis).toBeInstanceOf(Array);
  });
}); 