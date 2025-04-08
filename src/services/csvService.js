const logger = require('../utils/logger');

class CsvService {
  convertToCsv(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    try {
      // 각 API 응답에서 매핑된 데이터 추출
      const mappedData = data.flatMap(response => {
        const responseData = Array.isArray(response.data) ? response.data : [response.data];
        return responseData.map(item => {
          const mappedItem = {};
          if (response.config && response.config.mapping) {
            response.config.mapping.forEach(map => {
              mappedItem[map.to] = item[map.from];
            });
          }
          return mappedItem;
        });
      });

      // 모든 헤더(매핑된 필드) 수집
      const headers = [...new Set(mappedData.flatMap(item => Object.keys(item)))];
      const headerRow = headers.join(',');
      
      // 각 행의 데이터 생성
      const rows = mappedData.map(item => {
        return headers.map(header => {
          const value = item[header] ?? '';
          return this.escapeValue(value);
        }).join(',');
      });

      return [headerRow, ...rows].join('\n');
    } catch (error) {
      logger.error('CSV 변환 중 오류 발생:', error);
      throw error;
    }
  }

  escapeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}

module.exports = CsvService; 