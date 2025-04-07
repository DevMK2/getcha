class CsvService {
  convertToCsv(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return '';
    }

    // 모든 가능한 필드 수집
    const fields = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => fields.add(key));
    });

    const headers = Array.from(fields);
    const rows = data.map(item => {
      return headers.map(field => {
        const value = item[field];
        if (value === undefined || value === null) {
          return '';
        }
        return this.escapeValue(value.toString());
      }).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  escapeValue(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

module.exports = { CsvService }; 