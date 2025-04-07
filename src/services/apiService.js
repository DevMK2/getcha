const axios = require('axios');
const logger = require('../utils/logger');
const apiResults = require('../config/apiResults');
const { replaceTemplateVariables } = require('./templateService');
const { mapResponseData } = require('./mappingService');

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
        const mappedData = mapResponseData(response.data.data, apiConfig.mapping);
        results.push(...mappedData);
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

module.exports = {
  processApi
}; 