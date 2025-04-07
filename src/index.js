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
async function processApi(apiConfig, apiId) {
  try {
    // URL 템플릿 변수 치환
    let urls = [apiConfig.url];
    let parametersList = [{ ...apiConfig.parameters }];
    let requestBodyList = apiConfig.body ? [{ ...apiConfig.body }] : [undefined];

    if (apiConfig.previousApiId) {
      const previousData = apiResults.get(apiConfig.previousApiId);
      if (previousData) {
        // URL 템플릿 처리
        const processedUrls = [];
        const processedParams = [];
        const processedBodies = [];

        // data[*] 형식이 있는지 확인
        const hasArrayPattern = urls[0].includes('[*]') || 
          JSON.stringify(parametersList[0]).includes('[*]') || 
          (requestBodyList[0] && JSON.stringify(requestBodyList[0]).includes('[*]'));

        if (hasArrayPattern && Array.isArray(previousData.data)) {
          // 배열 데이터에 대해 각각 처리
          for (const item of previousData.data) {
            const itemData = { data: [item] };
            
            // URL 처리
            const processedUrl = replaceTemplateVariables(urls[0], itemData, apiConfig.previousApiId);
            processedUrls.push(processedUrl);

            // Parameters 처리
            const processedParam = replaceTemplateVariables(parametersList[0], itemData, apiConfig.previousApiId);
            processedParams.push(processedParam);

            // Request Body 처리
            if (requestBodyList[0]) {
              const processedBody = replaceTemplateVariables(requestBodyList[0], itemData, apiConfig.previousApiId);
              processedBodies.push(processedBody);
            } else {
              processedBodies.push(undefined);
            }
          }

          urls = processedUrls;
          parametersList = processedParams;
          requestBodyList = processedBodies;
        } else {
          // 단일 데이터 처리
          urls = [replaceTemplateVariables(urls[0], previousData, apiConfig.previousApiId)];
          parametersList = [replaceTemplateVariables(parametersList[0], previousData, apiConfig.previousApiId)];
          if (requestBodyList[0]) {
            requestBodyList = [replaceTemplateVariables(requestBodyList[0], previousData, apiConfig.previousApiId)];
          }
        }
      }
    }

    const results = [];
    
    // 각 URL에 대해 API 호출 수행
    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await axios({
          method: apiConfig.method,
          url: `https://${apiConfig.host}${urls[i]}`,
          params: parametersList[i],
          headers: apiConfig.headers,
          data: requestBodyList[i]
        });

        // API 응답 데이터 저장
        if (!apiResults.has(apiId)) {
          apiResults.set(apiId, response.data);
        }

        // 응답 데이터 매핑
        const data = response.data.data;
        
        // 데이터가 배열인 경우와 단일 객체인 경우를 구분하여 처리
        const items = Array.isArray(data) ? data : [data];
        
        for (const item of items) {
          const mappedItem = {};
          for (const mapping of apiConfig.mapping) {
            const sourcePath = mapping.source.split('.');
            const targetField = mapping.target;
            
            let value = item;
            // data[*] 형식의 경로 처리
            if (sourcePath[0] === 'data[*]') {
              value = item[sourcePath[1]];
            } else {
              // 중첩된 객체 구조 처리
              for (const key of sourcePath) {
                if (value && typeof value === 'object') {
                  value = value[key];
                } else {
                  value = undefined;
                  break;
                }
              }
            }
            mappedItem[targetField] = value;
          }
          results.push(mappedItem);
        }
      } catch (error) {
        logger.error(`API 호출 중 오류 발생: ${error.message}`);
        throw error;
      }
    }

    return results;
  } catch (error) {
    logger.error(`API 호출 중 오류 발생: ${error.message}`);
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
      logger.info(`API 호출 중: ${api.name}`);
      const data = await processApi(api, api.id);
      results.push(...data);
    }

    // CSV 형식으로 변환
    const headers = config.apis[0].mapping.map(m => m.target).join(',');
    const rows = results.map(item => Object.values(item).join(','));
    const csv = [headers, ...rows].join('\n');
    
    logger.info('변환된 CSV 데이터:');
    logger.info(csv);
  } catch (error) {
    logger.error('프로그램 실행 중 오류 발생:', error);
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