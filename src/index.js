const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');
const winston = require('winston');

// 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// 설정 파일 로드
function loadConfig() {
  try {
    const configFile = fs.readFileSync(path.join(__dirname, '../config.yaml'), 'utf8');
    return yaml.load(configFile);
  } catch (error) {
    logger.error('설정 파일 로드 실패:', error);
    throw error;
  }
}

// JSON 경로에서 값을 추출
function getValueFromPath(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

// API 호출
async function callApi(apiConfig) {
  try {
    const response = await axios({
      method: apiConfig.method || 'GET',
      url: `https://${apiConfig.host}${apiConfig.url}`,
      params: apiConfig.parameters,
      headers: apiConfig.headers
    });
    return response.data;
  } catch (error) {
    logger.error(`API 호출 실패 - Host: ${apiConfig.host}, URL: ${apiConfig.url}`, {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return null;
  }
}

// CSV 행 생성
function createCsvRow(data, mapping) {
  return mapping.map(m => {
    const value = data ? getValueFromPath(data, m.path) : '';
    return `"${value}"`;
  }).join(',');
}

// CSV 테이블 생성
async function generateCsvTable() {
  const config = loadConfig();
  const csvRows = [];

  // 헤더 행 생성
  const headers = config.apis.flatMap(api => 
    api.mapping.map(m => m.header)
  );
  csvRows.push(headers.join(','));

  // API 호출 및 데이터 처리
  for (const api of config.apis) {
    const data = await callApi(api);
    const row = createCsvRow(data, api.mapping);
    csvRows.push(row);
  }

  return csvRows.join('\n');
}

// 메인 실행
async function main() {
  try {
    const csvContent = await generateCsvTable();
    fs.writeFileSync('output.csv', csvContent);
    logger.info('CSV 파일 생성 완료');
  } catch (error) {
    logger.error('프로그램 실행 실패:', error);
    process.exit(1);
  }
}

main(); 