const axios = require('axios');
const fs = require('fs');
const yaml = require('js-yaml');
const { loadConfig, executeApiCalls, convertToCsv, main } = require('./index');
const { ApiService } = require('./services/apiService');
const { CsvService } = require('./services/csvService');

// axios와 fs 모킹
jest.mock('axios');
jest.mock('fs');
jest.mock('./services/apiService');
jest.mock('./services/csvService');

describe('API 데이터 수집기', () => {
  beforeEach(() => {
    // 각 테스트 전에 모킹 초기화
    axios.mockClear();
    fs.readFileSync.mockClear();
    jest.clearAllMocks();
  });

  describe('설정 파일 로드', () => {
    it('YAML 설정 파일을 로드해야 함', async () => {
      const mockConfig = {
        apis: [
          {
            id: 'test-api',
            method: 'GET',
            url: '/users',
            host: 'api.example.com'
          }
        ]
      };

      fs.readFileSync.mockReturnValue(yaml.dump(mockConfig));

      const config = await loadConfig('config.yaml');
      expect(config).toEqual(mockConfig);
    });

    it('파일이 없을 때 에러를 던져야 함', async () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('파일을 찾을 수 없습니다');
      });

      await expect(loadConfig('config.yaml')).rejects.toThrow('파일을 찾을 수 없습니다');
    });

    it('잘못된 YAML 형식의 설정 파일 처리', async () => {
      fs.readFileSync.mockReturnValue('invalid: yaml: content: }');
      
      await expect(loadConfig('invalid.yaml')).rejects.toThrow();
    });

    it('필수 필드가 없는 설정 파일 처리', async () => {
      const invalidConfig = { foo: 'bar' };
      fs.readFileSync.mockReturnValue(yaml.dump(invalidConfig));
      
      await expect(loadConfig('config.yaml')).rejects.toThrow('잘못된 설정 파일 형식');
    });
  });

  describe('API 호출 및 데이터 매핑', () => {
    it('API를 호출하고 데이터를 매핑해야 함', async () => {
      const mockConfig = {
        apis: [
          {
            id: 'test-api',
            method: 'GET',
            url: '/users',
            host: 'api.example.com',
            mapping: [
              { source: 'id', target: 'user_id' },
              { source: 'name', target: 'user_name' }
            ]
          }
        ]
      };

      const mockMappedData = [
        { user_id: '1', user_name: 'John' },
        { user_id: '2', user_name: 'Jane' }
      ];

      ApiService.prototype.fetchData.mockResolvedValue(mockMappedData);

      const result = await executeApiCalls(mockConfig, 'test-api');
      expect(result).toEqual(mockMappedData);
    });

    it('API 호출 실패 시 에러 처리', async () => {
      const mockConfig = {
        apis: [
          {
            id: 'error-api',
            method: 'GET',
            url: '/error',
            host: 'api.example.com',
            mapping: []
          }
        ]
      };

      ApiService.prototype.fetchData.mockRejectedValue(new Error('네트워크 오류'));

      await expect(executeApiCalls(mockConfig, 'error-api')).rejects.toThrow('네트워크 오류');
    });
  });

  describe('CSV 변환', () => {
    it('데이터를 CSV 형식으로 변환해야 함', async () => {
      const mockData = [
        { user_id: '1', user_name: 'John' },
        { user_id: '2', user_name: 'Jane' }
      ];

      const expectedCsv = 'user_id,user_name\n1,John\n2,Jane';

      CsvService.prototype.convertToCsv.mockReturnValue(expectedCsv);

      const result = await convertToCsv(mockData);
      expect(result).toBe(expectedCsv);
    });

    it('빈 데이터 처리', async () => {
      CsvService.prototype.convertToCsv.mockReturnValue('');
      expect(await convertToCsv([])).toBe('');
    });
  });

  describe('메인 함수', () => {
    it('전체 프로세스가 성공적으로 실행되어야 함', async () => {
      const mockConfig = {
        apis: [
          {
            id: 'test-api',
            method: 'GET',
            url: '/users',
            host: 'api.example.com'
          }
        ]
      };

      const mockData = [
        { user_id: '1', user_name: 'John' }
      ];

      const mockCsv = 'user_id,user_name\n1,John';

      fs.readFileSync.mockReturnValue(yaml.dump(mockConfig));
      ApiService.prototype.fetchData.mockResolvedValue(mockData);
      CsvService.prototype.convertToCsv.mockReturnValue(mockCsv);

      const result = await main();
      expect(result).toBe(mockCsv);
      expect(fs.writeFileSync).toHaveBeenCalledWith('output.csv', mockCsv);
    });

    it('에러가 발생했을 때 적절히 처리되어야 함', async () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('파일을 찾을 수 없습니다');
      });

      await expect(main()).rejects.toThrow('파일을 찾을 수 없습니다');
    });
  });
}); 