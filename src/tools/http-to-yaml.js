const fs = require('fs');
const path = require('path');
const { backupConfig, saveYamlConfig } = require('./utils');
const winston = require('winston');

// 로거 설정
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.Console()
    ]
});

// HTTP 요청 파싱 함수
function parseHttpRequest(request) {
    logger.info(`파싱 시작: ${request}`);
    // 요청을 줄 단위로 분리
    const lines = request.split('\n').map(line => line.trim()).filter(line => line);
    
    // 첫 번째 줄에서 메소드와 URL 추출
    const firstLine = lines[0];
    const matches = firstLine.match(/^(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/);
    
    if (!matches) {
        logger.error(`잘못된 첫 번째 줄 형식: ${firstLine}`);
        throw new Error('잘못된 HTTP 요청 형식입니다.');
    }
    
    const [, method, url] = matches;
    
    // 기본 설정
    const config = {
        method: method,
        url: url,
        parameters: {},
        headers: {},
        mapping: []
    };

    // 헤더 처리
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const [key, ...values] = line.split(':');
        if (key && values.length > 0) {
            const value = values.join(':').trim();
            if (key.toUpperCase() === 'HOST') {
                config.host = value;
            } else {
                config.headers[key] = value;
            }
        }
    }

    // host가 없는 경우 기본값 설정
    if (!config.host) {
        config.host = 'localhost';
    }

    logger.info(`파싱 결과: ${JSON.stringify(config)}`);
    return config;
}

// HTTP 파일에서 요청 추출
function extractHttpRequests(content) {
    // HTTP 메소드로 시작하는 블록을 찾아 분리
    const requests = content.split(/\n(?=GET|POST|PUT|DELETE|PATCH)/).filter(req => req.trim());
    logger.info(`요청 블록 발견: ${requests.length}개`);
    logger.info(`요청 내용: ${JSON.stringify(requests)}`);
    return requests.map(req => parseHttpRequest(req.trim()));
}

// 메인 함수
function convertHttpToYaml(inputFile) {
    try {
        logger.info(`변환 시작: ${inputFile}`);
        
        // 입력 파일 읽기
        const content = fs.readFileSync(inputFile, 'utf8').replace(/\r\n/g, '\n');
        logger.info(`파일 내용: ${content}`);
        
        // HTTP 요청 추출 및 파싱
        const apis = extractHttpRequests(content);
        logger.info(`${apis.length}개의 HTTP 요청 발견`);
        
        if (apis.length === 0) {
            const error = new Error('파싱된 API 요청이 없습니다. 입력 파일을 지정해주세요.');
            logger.error(error.message);
            if (process.env.NODE_ENV !== 'test') {
                process.exit(1);
            }
            throw error;
        }
        
        // 기존 config.yaml 백업
        backupConfig();
        logger.info('기존 설정 파일 백업 완료');
        
        // config.yaml 저장
        saveYamlConfig(apis, 'config.yaml');
        
        return apis;
    } catch (error) {
        logger.error('변환 중 오류 발생:', error);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw error;
    }
}

// CLI에서 직접 실행될 때만 실행
if (require.main === module) {
    const inputFile = process.argv[2];
    
    if (!inputFile) {
        logger.error('입력 파일을 지정해주세요.');
        process.exit(1);
    }
    
    convertHttpToYaml(inputFile);
}

module.exports = {
    convertHttpToYaml,
    parseHttpRequest
}; 