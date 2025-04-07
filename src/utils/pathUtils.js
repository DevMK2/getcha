// 객체 경로에서 값을 가져오는 함수
function getValueFromPath(obj, path) {
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
        if (part.includes('[*]')) {
            const [arrayName] = part.split('[*]');
            if (Array.isArray(value[arrayName])) {
                return value[arrayName].map(item => item[parts[parts.length - 1]]);
            }
        } else if (part.includes('[') && part.includes(']')) {
            const [arrayName, index] = part.split(/[\[\]]/);
            value = value[arrayName][parseInt(index)];
        } else {
            value = value[part];
        }
        
        if (value === undefined) {
            return undefined;
        }
    }
    
    return value;
}

// 템플릿 변수 치환 함수
function replaceTemplateVariables(template, previousData, previousApiId) {
    if (typeof template === 'string') {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const [apiName, ...parts] = path.trim().split('.');
            if (apiName === previousApiId) {
                return getValueFromPath(previousData, parts.join('.'));
            }
            return match;
        });
    } else if (typeof template === 'object' && template !== null) {
        return Object.entries(template).reduce((acc, [key, value]) => {
            acc[key] = replaceTemplateVariables(value, previousData, previousApiId);
            return acc;
        }, Array.isArray(template) ? [] : {});
    }
    return template;
}

module.exports = {
    getValueFromPath,
    replaceTemplateVariables
}; 