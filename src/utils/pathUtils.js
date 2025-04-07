// 객체 경로에서 값을 가져오는 함수
function getValueFromPath(obj, path) {
    // [*] 형식의 경로인 경우 바로 배열 반환
    if (path === '[*]') {
        return Array.isArray(obj) ? obj : [obj];
    }

    // [*].field 형식의 경로인 경우
    if (path.startsWith('[*].')) {
        const fieldPath = path.substring(4);
        if (Array.isArray(obj)) {
            return obj.map(item => getValueFromPath(item, fieldPath));
        }
        return [getValueFromPath(obj, fieldPath)];
    }

    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
        if (part.includes('[') && part.includes(']')) {
            const [arrayName, index] = part.split(/[\[\]]/);
            if (arrayName) {
                value = value[arrayName];
            }
            if (index !== '*') {
                value = value[parseInt(index)];
            }
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
                const value = getValueFromPath(previousData, parts.join('.'));
                if (Array.isArray(value)) {
                    return value[0];
                }
                return value;
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