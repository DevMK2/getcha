const axios = require('axios');
const { processApi } = require('./services/apiService');
const { loadConfig, executeApiCalls, convertToCSV } = require('./index');
const apiResults = require('./config/apiResults');

jest.mock('axios');
jest.mock('./utils/logger');

describe('API 데이터 수집기', () => {
  beforeEach(() => {
    // 각 테스트 전에 axios 모킹 초기화
    axios.mockClear();
    apiResults.clear();
  });

  test('단일 API 호출 및 데이터 매핑', async () => {
    // 모킹된 API 응답
    axios.mockResolvedValueOnce({
      data: {
        data: [
          { id: '1', name: 'John' },
          { id: '2', name: 'Jane' }
        ]
      }
    });

    const apiConfig = {
      id: 'test-api',
      host: 'api.example.com',
      url: '/users',
      method: 'GET',
      parameters: { limit: 10 },
      headers: { Authorization: 'Bearer token123' },
      mapping: [
        { source: 'data[*].id', target: 'user_id' },
        { source: 'data[*].name', target: 'user_name' }
      ]
    };

    const result = await processApi(apiConfig, 'test-api');

    expect(result).toEqual([
      { user_id: '1', user_name: 'John' },
      { user_id: '2', user_name: 'Jane' }
    ]);
  });

  test('이전 API 응답을 다음 API에서 다양한 방식으로 사용', async () => {
    // 첫 번째 API 응답
    axios.mockResolvedValueOnce({
      data: {
        data: [
          { id: '1', name: 'John', role: 'admin', department: 'IT' },
          { id: '2', name: 'Jane', role: 'user', department: 'HR' }
        ]
      }
    });

    // 두 번째 API 응답 (id=1)
    axios.mockResolvedValueOnce({
      data: {
        data: {
          id: '1',
          email: 'john@example.com',
          profile: {
            address: 'Seoul',
            team: 'Backend'
          }
        }
      }
    });

    // 두 번째 API 응답 (id=2)
    axios.mockResolvedValueOnce({
      data: {
        data: {
          id: '2',
          email: 'jane@example.com',
          profile: {
            address: 'Busan',
            team: 'Frontend'
          }
        }
      }
    });

    const firstApiConfig = {
      id: 'first-api',
      host: 'api.example.com',
      url: '/users',
      method: 'GET',
      parameters: { limit: 10 },
      headers: { Authorization: 'Bearer token123' },
      mapping: [
        { source: 'data[*].id', target: 'user_id' },
        { source: 'data[*].name', target: 'user_name' },
        { source: 'data[*].role', target: 'user_role' },
        { source: 'data[*].department', target: 'user_department' }
      ]
    };

    const secondApiConfig = {
      id: 'second-api',
      host: 'api.example.com',
      url: '/users/{{first-api.data[*].id}}/details',  // path parameter 사용
      method: 'POST',  // POST 메서드로 변경
      parameters: {  // query parameter에서 이전 API 응답 사용
        role: '{{first-api.data[*].role}}',
        department: '{{first-api.data[*].department}}'
      },
      headers: { 
        Authorization: 'Bearer token123',
        'Content-Type': 'application/json'
      },
      body: {  // request body에서 이전 API 응답 사용
        userName: '{{first-api.data[*].name}}',
        userRole: '{{first-api.data[*].role}}',
        metadata: {
          department: '{{first-api.data[*].department}}'
        }
      },
      mapping: [
        { source: 'id', target: 'detail_user_id' },
        { source: 'email', target: 'email' },
        { source: 'profile.address', target: 'address' },
        { source: 'profile.team', target: 'team' }
      ],
      previousApiId: 'first-api'
    };

    // 첫 번째 API 호출
    const firstResult = await processApi(firstApiConfig, 'first-api');
    expect(firstResult).toEqual([
      { user_id: '1', user_name: 'John', user_role: 'admin', user_department: 'IT' },
      { user_id: '2', user_name: 'Jane', user_role: 'user', user_department: 'HR' }
    ]);

    // 두 번째 API 호출
    const secondResult = await processApi(secondApiConfig, 'second-api');
    expect(secondResult).toEqual([
      { 
        detail_user_id: '1', 
        email: 'john@example.com', 
        address: 'Seoul',
        team: 'Backend'
      },
      { 
        detail_user_id: '2', 
        email: 'jane@example.com', 
        address: 'Busan',
        team: 'Frontend'
      }
    ]);

    // axios 호출 검증
    expect(axios).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://api.example.com/users/1/details',
      params: {
        role: 'admin',
        department: 'IT'
      },
      headers: {
        Authorization: 'Bearer token123',
        'Content-Type': 'application/json'
      },
      data: {
        userName: 'John',
        userRole: 'admin',
        metadata: {
          department: 'IT'
        }
      }
    });

    expect(axios).toHaveBeenCalledWith({
      method: 'POST',
      url: 'https://api.example.com/users/2/details',
      params: {
        role: 'user',
        department: 'HR'
      },
      headers: {
        Authorization: 'Bearer token123',
        'Content-Type': 'application/json'
      },
      data: {
        userName: 'Jane',
        userRole: 'user',
        metadata: {
          department: 'HR'
        }
      }
    });
  });

  test('API 호출 실패 시 에러 처리', async () => {
    // API 오류 응답 모킹
    axios.mockRejectedValueOnce(new Error('API 호출 실패'));

    const apiConfig = {
      id: 'error-api',
      host: 'api.example.com',
      url: '/error',
      method: 'GET',
      parameters: {},
      headers: {},
      mapping: []
    };

    await expect(processApi(apiConfig, 'error-api')).rejects.toThrow('API 호출 실패');
  });

  test('config.yaml 파일이 올바르게 로드되는지 확인', () => {
    const config = loadConfig('test/fixtures/config.yaml');
    expect(config).toBeDefined();
    expect(config.apis).toBeDefined();
    expect(Array.isArray(config.apis)).toBe(true);
  });

  test('CSV 변환이 올바르게 동작하는지 확인', () => {
    const data = [
      { id: '1', name: 'John', email: 'john@example.com' },
      { id: '2', name: 'Jane, Jr.', email: 'jane@example.com' }
    ];

    const csv = convertToCSV(data);
    expect(csv).toBe('id,name,email\n1,John,john@example.com\n2,"Jane, Jr.",jane@example.com');
  });

  test('CSV 변환 시 빈 데이터 처리', () => {
    expect(convertToCSV([])).toBe('');
    expect(convertToCSV(null)).toBe('');
    expect(convertToCSV(undefined)).toBe('');
  });
}); 