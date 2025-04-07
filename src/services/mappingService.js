const { getValueFromPath } = require('../utils/pathUtils');

function mapResponseData(data, mapping) {
  if (!data) return [];
  
  const mappedData = [];
  const items = Array.isArray(data) ? data : [data];
  
  for (const item of items) {
    const mappedItem = {};
    for (const mappingRule of mapping) {
      const sourcePath = mappingRule.source;
      const targetField = mappingRule.target;
      
      if (sourcePath.startsWith('[*]')) {
        mappedItem[targetField] = getValueFromPath(item, sourcePath.substring(4));
      } else {
        mappedItem[targetField] = getValueFromPath(item, sourcePath);
      }
    }
    mappedData.push(mappedItem);
  }

  return mappedData;
}

module.exports = {
  mapResponseData
}; 