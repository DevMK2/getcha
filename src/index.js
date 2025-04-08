const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const logger = require('./utils/logger');
const ApiService = require('./services/apiService');
const CsvService = require('./services/csvService');

// YAML 설정 파일 로드
async function loadConfig(configPath) {
  try {
    const content = await fs.readFile(configPath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`설정 파일을 찾을 수 없습니다: ${configPath}`);
    }
    throw error;
  }
}

// API 호출 실행
async function executeApiCalls(config) {
  const results = [];
  
  for (const api of config.apis) {
    try {
      const apiService = new ApiService(api);
      const data = await apiService.fetchData();
      results.push(data);
    } catch (error) {
      logger.error(`API 호출 중 오류 발생 (${api.name}):`, error);
      throw error;
    }
  }
  
  return results;
}

// CSV 형식으로 변환
async function convertToCsv(data, outputPath) {
  const csvService = new CsvService();
  const csv = csvService.convertToCsv(data);
  await fs.writeFile(outputPath, csv, 'utf8');
  logger.info(`CSV 파일이 생성되었습니다: ${outputPath}`);
}

// 메인 함수
async function main() {
  try {
    // 커맨드 라인 인자에서 설정 파일 경로 가져오기
    const configPath = process.argv[2] || 'config.yaml';
    
    logger.info(`설정 파일을 로드합니다: ${configPath}`);
    const config = await loadConfig(configPath);
    
    logger.info('API 호출을 시작합니다...');
    const results = await executeApiCalls(config);
    
    logger.info('CSV 변환을 시작합니다...');
    await convertToCsv(results, config.output || 'output.csv');
    
    logger.info('모든 작업이 완료되었습니다.');
  } catch (error) {
    logger.error('프로그램 실행 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

// 프로그램 실행
if (require.main === module && process.env.NODE_ENV !== 'test') {
  main().catch(() => process.exit(1));
}

module.exports = {
  loadConfig,
  executeApiCalls,
  convertToCsv,
  main
};
