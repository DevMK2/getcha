const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');
const winston = require('winston');
const { processApi } = require('./services/apiService');
const logger = require('./utils/logger');

// 로거 설정
const apiLogger = winston.createLogger({
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

// API 응답 데이터 저장소
const apiResults = new Map();

// 템플릿 변수 치환 함수
function replaceTemplateVariables(template, previousData, previousApiId) {
  if (typeof template === 'string') {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const [apiName, ...parts] = path.trim().split('.');
      if (apiName === previousApiId) {
        let value = previousData;
        for (const part of parts) {
          if (part.includes('[*]')) {
            const [arrayName] = part.split('[*]');
            if (Array.isArray(value[arrayName])) {
              return value[arrayName].map(item => item[parts[parts.length - 1]]);
            }
          } else if (part.includes('[') && part.includes(']')) {
            const [arrayName, index] = part.split(/[\[\]]/);
            value = value[arrayName][parseInt(index)];
          } else {
            value = value[part];
          }
        }
        return value;
      }
      return match;
    });
  } else if (typeof template === 'object' && template !== null) {
    return Object.entries(template).reduce((acc, [key, value]) => {
      acc[key] = replaceTemplateVariables(value, previousData, previousApiId);
      return acc;
    }, Array.isArray(template) ? [] : {});
  }
  return template;
}

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
    apiLogger.error(`API 호출 실패 - Host: ${apiConfig.host}, URL: ${apiConfig.url}`, {
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
  const config = loadConfig(path.join(__dirname, '../config.yaml'));
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