const fs = require('fs');
const path = require('path');
const { backupConfig, saveYamlConfig } = require('./utils');

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
function convertCurlToYaml(inputFile, outputFile) {
    try {
        // 입력 파일 읽기
        const content = fs.readFileSync(inputFile, 'utf8');
        
        // curl 명령어들을 분리
        const curlCommands = content.split('\n').filter(line => line.trim().startsWith('curl'));
        
        // 각 curl 명령어를 파싱하여 설정 객체 생성
        const apis = curlCommands.map(parseCurlCommand);
        
        if (apis.length === 0) {
            console.error('파싱된 API 요청이 없습니다. 입력 파일을 확인해주세요.');
            process.exit(1);
        }
        
        // 기존 config.yaml 백업
        backupConfig();
        
        // 루트 디렉토리에 config.yaml 저장
        const outputPath = path.join(__dirname, '..', outputFile);
        saveYamlConfig(apis, outputPath);
        
    } catch (error) {
        console.error('변환 중 오류 발생:', error.message);
        process.exit(1);
    }
}

module.exports = {
    convertCurlToYaml
}; 