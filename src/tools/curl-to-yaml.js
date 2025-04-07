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

// curl 명령어 파싱 함수
function parseCurlCommand(curlCommand) {
    // curl 명령어에서 따옴표 제거
    curlCommand = curlCommand.replace(/^['"]|['"]$/g, '');
    
    // 기본 설정
    const config = {
        host: '',
        url: '',
        method: 'GET',
        parameters: {},
        headers: {},
        mapping: []
    };

    // URL 추출
    const urlMatch = curlCommand.match(/curl\s+(?:-X\s+\w+\s+)?["']?(https?:\/\/[^"'\s]+)["']?/);
    if (urlMatch) {
        try {
            const url = urlMatch[1];
            console.log('Extracted URL:', url);  // 디버깅용
            const urlObj = new URL(url);
            config.host = urlObj.host;
            config.url = urlObj.pathname;
            
            // 쿼리 파라미터 추출
            urlObj.searchParams.forEach((value, key) => {
                config.parameters[key] = value;
            });
        } catch (error) {
            console.error('URL 파싱 실패:', error.message);
            throw error;
        }
    } else {
        throw new Error('URL을 찾을 수 없습니다');
    }

    // 메소드 추출
    const methodMatch = curlCommand.match(/-X\s+(\w+)/i);
    if (methodMatch) {
        config.method = methodMatch[1].toUpperCase();
    }

    // 헤더 추출
    const headerMatches = curlCommand.match(/-H\s+["']([^"']+)["']/g);
    if (headerMatches) {
        headerMatches.forEach(header => {
            const [key, value] = header.replace(/-H\s+["']/, '').replace(/["']$/, '').split(': ');
            config.headers[key] = value;
        });
    }

    // 데이터 추출 (POST 요청의 경우)
    const dataMatch = curlCommand.match(/-d\s+["']([^"']+)["']/);
    if (dataMatch) {
        try {
            const data = JSON.parse(dataMatch[1]);
            config.body = data;
        } catch (e) {
            console.warn('데이터 파싱 실패:', e.message);
        }
    }

    return config;
}

// 메인 함수
function convertCurlToYaml(inputFile) {
    try {
        logger.info(`변환 시작: ${inputFile}`);
        
        // 입력 파일 읽기
        const content = fs.readFileSync(inputFile, 'utf8');
        logger.info('입력 파일 읽기 완료');
        
        // curl 명령어들을 분리
        const curlCommands = content.split('\n').filter(line => line.trim().startsWith('curl'));
        logger.info(`${curlCommands.length}개의 curl 명령어 발견`);
        
        // 각 curl 명령어를 파싱하여 설정 객체 생성
        const apis = curlCommands.map(parseCurlCommand);
        
        if (apis.length === 0) {
            const error = new Error('파싱된 API 요청이 없습니다. 입력 파일을 확인해주세요.');
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
    
    convertCurlToYaml(inputFile);
}

module.exports = {
    convertCurlToYaml
}; 