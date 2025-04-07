const fs = require('fs');
const yaml = require('js-yaml');
const logger = require('./utils/logger');
const { ApiService } = require('./services/apiService');
const { CsvService } = require('./services/csvService');

// YAML 설정 파일 로드
async function loadConfig(configFile) {
  try {
    const content = fs.readFileSync(configFile, 'utf8');
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
      throw new Error(`API ID '${apiId}'를 찾을 수 없습니다.`);
    }

    const apiService = new ApiService();
    return await apiService.fetchData(api);
  } catch (error) {
    logger.error('API 호출 중 오류 발생:', error.message);
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
    const config = await loadConfig('config.yaml');
    const data = await executeApiCalls(config, config.apis[0].id);
    const csv = await convertToCsv(data);
    
    fs.writeFileSync('output.csv', csv);
    logger.info('데이터가 output.csv 파일로 저장되었습니다.');
    
    return csv;
  } catch (error) {
    logger.error('프로그램 실행 중 오류 발생:', error.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
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
