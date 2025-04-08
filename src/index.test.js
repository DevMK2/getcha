const fs = require('fs');
const yaml = require('js-yaml');
const { loadConfig, executeApiCalls, convertToCsv, main } = require('./index');
const ApiService = require('./services/apiService');
const CsvService = require('./services/csvService');

// 모듈 모의화
jest.mock('fs');
jest.mock('./services/apiService');
jest.mock('./services/csvService');

describe('API 데이터 수집기', () => {
  // 테스트 데이터
  const mockConfig = {
    apis: [
      {
        id: 'test-api',
        name: 'Test API',
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: { 'Content-Type': 'application/json' },
        mapping: [
          { from: 'id', to: 'user_id' },
          { from: 'name', to: 'user_name' }
        ]
      }
    ]
  };

  const mockData = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ];

  const mockMappedData = [
    { user_id: 1, user_name: 'John' },
    { user_id: 2, user_name: 'Jane' }
  ];

  const mockCsv = 'user_id,user_name\n1,John\n2,Jane';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('설정 파일 로드', () => {
    it('유효한 설정 파일을 로드해야 함', async () => {
      fs.readFile = jest.fn().mockResolvedValue(yaml.dump(mockConfig));
      const config = await loadConfig('config.yaml');
      expect(config).toEqual(mockConfig);
    });

    it('존재하지 않는 파일 처리', async () => {
      fs.readFile = jest.fn().mockRejectedValue(new Error('ENOENT'));
      await expect(loadConfig('nonexistent.yaml')).rejects.toThrow('설정 파일을 찾을 수 없습니다');
    });

    it('잘못된 형식의 설정 파일 처리', async () => {
      const invalidConfig = { notApis: [] };
      fs.readFile = jest.fn().mockResolvedValue(yaml.dump(invalidConfig));
      await expect(loadConfig('config.yaml')).rejects.toThrow('잘못된 설정 파일 형식');
    });
  });

  describe('API 호출 및 데이터 매핑', () => {
    beforeEach(() => {
      ApiService.mockImplementation(() => ({
        fetchData: jest.fn()
      }));
    });

    it('API를 호출하고 데이터를 매핑해야 함', async () => {
      const mockApiService = new ApiService();
      mockApiService.fetchData.mockResolvedValue(mockMappedData);

      const result = await executeApiCalls(mockConfig);
      expect(result).toEqual([mockMappedData]);
    });

    it('API 호출 실패 시 에러 처리', async () => {
      const mockApiService = new ApiService();
      mockApiService.fetchData.mockRejectedValue(new Error('네트워크 오류'));

      await expect(executeApiCalls(mockConfig)).rejects.toThrow('네트워크 오류');
    });
  });

  describe('CSV 변환', () => {
    beforeEach(() => {
      CsvService.mockImplementation(() => ({
        convertToCsv: jest.fn()
      }));
    });

    it('데이터를 CSV 형식으로 변환해야 함', async () => {
      const mockCsvService = new CsvService();
      mockCsvService.convertToCsv.mockReturnValue(mockCsv);

      const result = await convertToCsv(mockData, 'output.csv');
      expect(result).toBe(mockCsv);
    });

    it('빈 데이터 처리', async () => {
      const mockCsvService = new CsvService();
      mockCsvService.convertToCsv.mockReturnValue('');

      const result = await convertToCsv([], 'output.csv');
      expect(result).toBe('');
    });
  });

  describe('메인 함수', () => {
    beforeEach(() => {
      process.argv = ['node', 'index.js'];
      fs.readFile = jest.fn();
      ApiService.mockImplementation(() => ({
        fetchData: jest.fn()
      }));
      CsvService.mockImplementation(() => ({
        convertToCsv: jest.fn()
      }));
    });

    it('전체 프로세스가 성공적으로 실행되어야 함', async () => {
      process.argv[2] = 'config.yaml';
      fs.readFile.mockResolvedValue(yaml.dump(mockConfig));
      
      const mockApiService = new ApiService();
      mockApiService.fetchData.mockResolvedValue(mockData);
      
      const mockCsvService = new CsvService();
      mockCsvService.convertToCsv.mockReturnValue(mockCsv);

      await main();
      expect(fs.readFile).toHaveBeenCalledWith('config.yaml', 'utf8');
    });

    it('에러가 발생했을 때 적절히 처리되어야 함', async () => {
      process.argv[2] = undefined;
      await expect(main()).rejects.toThrow('설정 파일을 찾을 수 없습니다');
    });
  });
}); 