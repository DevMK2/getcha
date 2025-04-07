const axios = require('axios');
const logger = require('../utils/logger');
const apiResults = require('../config/apiResults');
const { replaceTemplateVariables } = require('../utils/pathUtils');
const { mapResponseData } = require('./mappingService');

class ApiService {
  constructor(config) {
    this.config = config;
  }

  async fetchData(apiId) {
    try {
      const apiConfig = this.config.apis.find(api => api.id === apiId);
      if (!apiConfig) {
        throw new Error(`API 설정을 찾을 수 없습니다: ${apiId}`);
      }

      const response = await axios({
        method: apiConfig.method,
        url: `https://${apiConfig.host}${apiConfig.url}`,
        params: apiConfig.parameters,
        headers: apiConfig.headers
      });

      return this.transformData(response.data, apiConfig.mapping);
    } catch (error) {
      logger.error('API 호출 중 오류 발생:', error.message);
      throw error;
    }
  }

  transformData(data, mapping) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    return data.map(item => {
      const transformed = {};
      mapping.forEach(({ source, target }) => {
        transformed[target] = item[source];
      });
      return transformed;
    });
  }
}

module.exports = { ApiService }; 