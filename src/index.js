const fs = require('fs').promises;
const yaml = require('js-yaml');
const logger = require('./utils/logger');
const ApiService = require('./services/apiService');
const CsvService = require('./services/csvService');

// YAML 설정 파일 로드
async function loadConfig(configFile) {
  try {
    const content = await fs.readFile(configFile, 'utf8');
    const config = yaml.load(content);

    if (!config || !config.apis) {
      throw new Error('잘못된 설정 파일 형식');
    }

    return config;
  } catch (error) {
    logger.error('설정 파일 로드 중 오류 발생:', error.message);
    throw error;
  }
}

// API 호출 실행
async function executeApiCalls(config, apiId) {
  try {
    const api = config.apis.find(api => api.id === apiId);
    if (!api) {
      throw new Error(`API를 찾을 수 없습니다: ${apiId}`);
    }

    const apiService = new ApiService();
    const response = await apiService.fetchData(api);
    return response;
  } catch (error) {
    logger.error('API 호출 중 오류 발생:', error);
    throw error;
  }
}

// CSV 형식으로 변환
async function convertToCsv(data) {
  try {
    const csvService = new CsvService();
    return csvService.convertToCsv(data);
  } catch (error) {
    logger.error('CSV 변환 중 오류 발생:', error.message);
    throw error;
  }
}

// 메인 함수
async function main() {
  try {
    const configFile = process.argv[2];
    if (!configFile) {
      throw new Error('설정 파일 경로를 지정해주세요.');
    }

    const config = await loadConfig(configFile);
    const allData = [];

    for (const api of config.apis) {
      try {
        const data = await executeApiCalls(config, api.id);
        allData.push(...data);
      } catch (error) {
        logger.error(`${api.id} API 호출 중 오류 발생:`, error);
      }
    }

    if (allData.length > 0) {
      const csvService = new CsvService();
      const csv = await csvService.convertToCsv(allData);
      await fs.writeFile('output.csv', csv);
      logger.info('데이터가 output.csv 파일로 저장되었습니다.');
    } else {
      logger.warn('저장할 데이터가 없습니다.');
    }
  } catch (error) {
    logger.error('프로그램 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 프로그램 실행
if (require.main === module) {
  main().catch(() => process.exit(1));
}

module.exports = {
  loadConfig,
  executeApiCalls,
  convertToCsv,
  main
};
