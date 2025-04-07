const axios = require('axios');
const { loadConfig, executeApiCalls, convertToCSV } = require('./index');
const { processApi } = require('./services/apiService');
const apiResults = require('./config/apiResults');

// axios 모킹
jest.mock('axios');

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
        { source: 'id', target: 'user_id' },
        { source: 'name', target: 'user_name' }
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

    // 첫 번째 API 호출
    const firstApiConfig = {
      id: 'users-api',
      host: 'api.example.com',
      url: '/users',
      method: 'GET',
      parameters: {},
      headers: { Authorization: 'Bearer token123' },
      mapping: [
        { source: 'id', target: 'user_id' },
        { source: 'name', target: 'user_name' },
        { source: 'role', target: 'user_role' },
        { source: 'department', target: 'department' }
      ]
    };

    await processApi(firstApiConfig, 'users-api');

    // 두 번째 API 응답
    axios.mockResolvedValueOnce({
      data: {
        data: { success: true }
      }
    }).mockResolvedValueOnce({
      data: {
        data: { success: true }
      }
    });

    // 두 번째 API 호출
    const secondApiConfig = {
      id: 'user-details-api',
      host: 'api.example.com',
      url: '/users/{{users-api.data.id}}/details',
      method: 'POST',
      parameters: {
        role: '{{users-api.data.role}}',
        department: '{{users-api.data.department}}'
      },
      headers: {
        Authorization: 'Bearer token123',
        'Content-Type': 'application/json'
      },
      body: {
        userName: '{{users-api.data.name}}',
        userRole: '{{users-api.data.role}}',
        metadata: {
          department: '{{users-api.data.department}}'
        }
      },
      mapping: [
        { source: 'success', target: 'success' }
      ],
      previousApiId: 'users-api'
    };

    const result = await processApi(secondApiConfig, 'user-details-api');

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
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane, Jr.', email: 'jane@example.com' }
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