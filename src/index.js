const fs = require('fs');
const yaml = require('js-yaml');
const { processApi } = require('./services/apiService');
const logger = require('./utils/logger');

// YAML 설정 파일 로드
function loadConfig(configPath) {
  try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configFile);
  } catch (error) {
    logger.error(`설정 파일 로드 중 오류 발생: ${error.message}`);
    throw error;
  }
}

// API 호출 실행
async function executeApiCalls(config) {
  try {
    const results = [];
    for (const api of config.apis) {
      const result = await processApi(api, api.id);
      results.push(...result);
    }
    return results;
  } catch (error) {
    logger.error(`API 호출 실행 중 오류 발생: ${error.message}`);
    throw error;
  }
}

// CSV 형식으로 변환
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(item => 
    headers.map(header => {
      const value = item[header];
      // 문자열이고 쉼표를 포함하는 경우에만 큰따옴표로 감싸기
      return typeof value === 'string' && value.includes(',') ? 
        `"${value}"` : value;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// 메인 함수
async function main() {
  try {
    const config = loadConfig('config.yaml');
    const results = await executeApiCalls(config);
    const csvData = convertToCSV(results);
    console.log(csvData);
  } catch (error) {
    logger.error(`프로그램 실행 중 오류 발생: ${error.message}`);
    process.exit(1);
  }
}

// 프로그램 실행
if (require.main === module) {
  main();
}

module.exports = {
  loadConfig,
  executeApiCalls,
  convertToCSV,
  main
};
