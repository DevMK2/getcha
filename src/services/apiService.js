const axios = require('axios');
const logger = require('../utils/logger');
const apiResults = require('../config/apiResults');
const { replaceTemplateVariables } = require('../utils/pathUtils');
const { mapResponseData } = require('./mappingService');

class ApiService {
  constructor(config) {
    this.config = config;
  }

  async fetchData() {
    try {
      const response = await axios({
        method: this.config.method,
        url: this.config.url,
        headers: this.config.headers,
        data: this.config.body
      });

      // 응답에 설정 정보 포함
      return {
        data: response.data,
        config: this.config
      };
    } catch (error) {
      logger.error(`API 호출 중 오류 발생 (${this.config.method} ${this.config.url.split('/').pop()}):`, error);
      throw error;
    }
  }

  transformData(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    return data.map(item => {
      const transformed = {};
      this.config.mapping.forEach(({ from, to }) => {
        transformed[to] = item[from] ?? '';
      });
      return transformed;
    });
  }
}

module.exports = ApiService; 