const fs = require('fs');
const path = require('path');
const { backupConfig, saveYamlConfig } = require('./utils');

// HTTP 요청 파싱 함수
function parseHttpRequest(content) {
    // HTTP 요청을 줄 단위로 분리
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    // 첫 번째 줄에서 메소드와 URL 추출
    const firstLine = lines[0];
    const [method, url] = firstLine.split(' ');
    
    // URL 객체 생성
    const urlObj = new URL(url);
    
    // 기본 설정
    const config = {
        host: urlObj.host,
        url: urlObj.pathname,
        method: method,
        parameters: {},
        headers: {},
        mapping: []
    };
    
    // 쿼리 파라미터 추출
    urlObj.searchParams.forEach((value, key) => {
        config.parameters[key] = value;
    });
    
    // 헤더와 본문 분리
    let bodyStartIndex = lines.findIndex(line => line === '');
    if (bodyStartIndex === -1) bodyStartIndex = lines.length;
    
    // 헤더 파싱
    for (let i = 1; i < bodyStartIndex; i++) {
        const [key, ...values] = lines[i].split(':');
        if (key && values.length > 0) {
            config.headers[key.trim()] = values.join(':').trim();
        }
    }
    
    // 본문 파싱
    if (bodyStartIndex < lines.length) {
        const body = lines.slice(bodyStartIndex + 1).join('\n');
        if (body) {
            try {
                const data = JSON.parse(body);
                Object.assign(config.parameters, data);
            } catch (e) {
                console.warn('본문 파싱 실패:', e.message);
            }
        }
    }
    
    return config;
}

// HTTP 파일에서 요청 추출
function extractHttpRequests(content) {
    const requests = [];
    // HTTP 메소드로 시작하는 블록을 찾기 위한 정규식
    const requestBlocks = content.split(/\n(?=GET|POST|PUT|DELETE|PATCH)/);
    
    requestBlocks.forEach(block => {
        const trimmedBlock = block.trim();
        // HTTP 메소드로 시작하는지 확인
        if (/^(GET|POST|PUT|DELETE|PATCH)\s+https?:\/\//.test(trimmedBlock)) {
            requests.push(parseHttpRequest(block));
        }
    });
    
    return requests;
}

// 메인 함수
function convertHttpToYaml(inputFile) {
    try {
        // 입력 파일 읽기
        const content = fs.readFileSync(inputFile, 'utf8');
        
        // HTTP 요청 파싱
        const apis = extractHttpRequests(content);
        
        if (apis.length === 0) {
            console.error('파싱된 API 요청이 없습니다. 입력 파일을 확인해주세요.');
            process.exit(1);
        }
        
        // 기존 config.yaml 백업
        backupConfig();
        
        // 루트 디렉토리에 config.yaml 저장
        const outputPath = path.join(__dirname, '..', 'config.yaml');
        saveYamlConfig(apis, outputPath);
        
    } catch (error) {
        console.error('변환 중 오류 발생:', error.message);
        process.exit(1);
    }
}

module.exports = {
    convertHttpToYaml
}; 