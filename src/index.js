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

// API 호출 함수
async function processApi(apiConfig) {
  try {
    const response = await axios({
      method: apiConfig.method,
      url: `https://${apiConfig.host}${apiConfig.url}`,
      params: apiConfig.parameters,
      headers: apiConfig.headers
    });

    // 응답 데이터 매핑
    const mappedData = [];
    const data = response.data.data || [];

    for (const item of data) {
      const mappedItem = {};
      for (const mapping of apiConfig.mapping) {
        const sourcePath = mapping.source.split('.');
        const targetField = mapping.target;
        
        // data[*] 형식의 경로 처리
        if (sourcePath[0] === 'data[*]') {
          mappedItem[targetField] = item[sourcePath[1]];
        } else {
          let value = item;
          for (const key of sourcePath) {
            if (key && value) {
              value = value[key];
            }
          }
          mappedItem[targetField] = value;
        }
      }
      mappedData.push(mappedItem);
    }

    return mappedData;
  } catch (error) {
    console.error(`API 호출 중 오류 발생: ${error.message}`);
    throw error;
  }
}

// 메인 함수
async function main() {
  try {
    // config.yaml 파일 읽기
    const config = yaml.load(fs.readFileSync(path.join(__dirname, '../config.yaml'), 'utf8'));
    
    // 각 API 호출 및 데이터 수집
    const results = [];
    for (const api of config.apis) {
      console.log(`API 호출 중: ${api.name}`);
      const data = await processApi(api);
      results.push(...data);
    }

    // CSV 형식으로 변환
    const headers = config.apis[0].mapping.map(m => m.target).join(',');
    const rows = results.map(item => Object.values(item).join(','));
    const csv = [headers, ...rows].join('\n');
    
    console.log('변환된 CSV 데이터:');
    console.log(csv);
  } catch (error) {
    console.error('프로그램 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 테스트를 위해 processApi 함수 내보내기
module.exports = {
  processApi
};

// 직접 실행 시에만 main 함수 호출
if (require.main === module) {
  main();
} 