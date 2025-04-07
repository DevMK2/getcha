function mapResponseData(data, mapping) {
  const mappedData = [];
  const items = Array.isArray(data) ? data : [data];
  
  for (const item of items) {
    const mappedItem = {};
    for (const mappingRule of mapping) {
      const sourcePath = mappingRule.source.split('.');
      const targetField = mappingRule.target;
      
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
    mappedData.push(mappedItem);
  }

  return mappedData;
}

module.exports = {
  mapResponseData
}; 