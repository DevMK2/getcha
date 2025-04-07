const axios = require('axios');
const logger = require('../utils/logger');
const apiResults = require('../config/apiResults');
const { replaceTemplateVariables } = require('../utils/pathUtils');
const { mapResponseData } = require('./mappingService');

class ApiService {
  async fetchData(api) {
    try {
      const response = await axios({
        method: api.method,
        url: api.url,
        headers: api.headers
      });

      return this.transformData(response.data, api.mapping);
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
      mapping.forEach(({ from, to }) => {
        transformed[to] = item[from];
      });
      return transformed;
    });
  }
}

module.exports = ApiService; 