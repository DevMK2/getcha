const logger = require('../utils/logger');

class CsvService {
  convertToCsv(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }

    // 모든 가능한 필드를 수집
    const fields = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => fields.add(key));
    });

    const headers = Array.from(fields);
    const rows = data.map(item => 
      headers.map(field => this.escapeValue(item[field] || '')).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  escapeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    value = String(value);
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

module.exports = CsvService; 