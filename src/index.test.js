const axios = require('axios');
const fs = require('fs').promises;
const yaml = require('js-yaml');
const { loadConfig, executeApiCalls, convertToCsv, main } = require('./index');
const { ApiService } = require('./services/apiService');
const { CsvService } = require('./services/csvService');

// axios와 fs 모킹
jest.mock('axios');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));
jest.mock('./services/apiService');
jest.mock('./services/csvService');

describe('API 데이터 수집기', () => {
  beforeEach(() => {
    // 각 테스트 전에 모킹 초기화
    axios.mockClear();
    fs.readFile.mockClear();
    jest.clearAllMocks();
  });

  describe('설정 파일 로드', () => {
    it('YAML 설정 파일을 로드해야 함', async () => {
      const mockConfig = {
        apis: [
          {
            id: 'test-api',
            name: 'Test API',
            method: 'GET',
            url: 'https://api.example.com/test'
          }
        ]
      };

      fs.readFile.mockResolvedValue(yaml.dump(mockConfig));
      const config = await loadConfig('config.yaml');
      expect(config).toEqual(mockConfig);
    });

    it('파일이 없을 때 에러를 던져야 함', async () => {
      const error = new Error('파일을 찾을 수 없습니다');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);

      await expect(loadConfig('config.yaml')).rejects.toThrow('파일을 찾을 수 없습니다');
    });

    it('잘못된 YAML 형식의 설정 파일 처리', async () => {
      fs.readFile.mockResolvedValue('invalid: yaml: content');

      await expect(loadConfig('config.yaml')).rejects.toThrow();
    });

    it('필수 필드가 없는 설정 파일 처리', async () => {
      const invalidConfig = { notApis: [] };
      fs.readFile.mockResolvedValue(yaml.dump(invalidConfig));

      await expect(loadConfig('config.yaml')).rejects.toThrow('잘못된 설정 파일 형식');
    });
  });

  describe('API 호출 및 데이터 매핑', () => {
    const mockConfig = {
      apis: [
        {
          id: 'test-api',
          method: 'GET',
          url: 'https://api.example.com/test'
        }
      ]
    };

    const mockMappedData = [
      { ID: '1', 제목: 'Test 1' },
      { ID: '2', 제목: 'Test 2' }
    ];

    it('API를 호출하고 데이터를 매핑해야 함', async () => {
      ApiService.prototype.fetchData.mockResolvedValue(mockMappedData);

      const result = await executeApiCalls(mockConfig, 'test-api');
      expect(result).toEqual(mockMappedData);
    });

    it('API 호출 실패 시 에러 처리', async () => {
      ApiService.prototype.fetchData.mockRejectedValue(new Error('네트워크 오류'));

      await expect(executeApiCalls(mockConfig, 'error-api')).rejects.toThrow('네트워크 오류');
    });
  });

  describe('CSV 변환', () => {
    const mockData = [
      { user_id: '1', user_name: 'John' },
      { user_id: '2', user_name: 'Jane' }
    ];

    it('데이터를 CSV 형식으로 변환해야 함', async () => {
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
            url: 'https://api.example.com/test'
          }
        ]
      };

      const mockData = [{ id: 1, name: 'Test' }];
      const mockCsv = 'id,name\n1,Test';

      process.argv[2] = 'config.yaml';
      fs.readFile.mockResolvedValue(yaml.dump(mockConfig));
      ApiService.prototype.fetchData.mockResolvedValue(mockData);
      CsvService.prototype.convertToCsv.mockReturnValue(mockCsv);

      await main();

      expect(fs.writeFile).toHaveBeenCalledWith('output.csv', mockCsv);
    });

    it('에러가 발생했을 때 적절히 처리되어야 함', async () => {
      process.argv[2] = undefined;
      await expect(main()).rejects.toThrow('설정 파일 경로를 지정해주세요.');
    });
  });
}); 