const axios = require('axios');
const logger = require('../utils/logger');
const apiResults = require('../config/apiResults');
const { replaceTemplateVariables } = require('../utils/pathUtils');
const { mapResponseData } = require('./mappingService');

async function processApi(apiConfig, apiId) {
  try {
    let response;
    if (apiConfig.previousApiId) {
      const previousData = apiResults.get(apiConfig.previousApiId);
      if (previousData && Array.isArray(previousData.data)) {
        const results = [];
        for (const item of previousData.data) {
          const processedConfig = {
            ...apiConfig,
            url: replaceTemplateVariables(apiConfig.url, { data: item }, apiConfig.previousApiId),
            parameters: replaceTemplateVariables(apiConfig.parameters, { data: item }, apiConfig.previousApiId),
            body: apiConfig.body ? replaceTemplateVariables(apiConfig.body, { data: item }, apiConfig.previousApiId) : undefined
          };

          response = await axios({
            method: processedConfig.method,
            url: `https://${processedConfig.host}${processedConfig.url}`,
            params: processedConfig.parameters,
            headers: processedConfig.headers,
            data: processedConfig.body
          });

          const mappedData = mapResponseData(response.data.data, processedConfig.mapping);
          results.push(...mappedData);
        }
        return results;
      }
    }

    // 이전 API 의존성이 없거나 단일 데이터인 경우
    response = await axios({
      method: apiConfig.method,
      url: `https://${apiConfig.host}${apiConfig.url}`,
      params: apiConfig.parameters,
      headers: apiConfig.headers,
      data: apiConfig.body
    });

    // API 응답 데이터 저장
    if (!apiResults.has(apiId)) {
      apiResults.set(apiId, response.data);
    }

    // 응답 데이터 매핑
    const mappedData = mapResponseData(response.data.data, apiConfig.mapping);
    return mappedData;
  } catch (error) {
    logger.error(`API 호출 중 오류 발생: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processApi
}; 