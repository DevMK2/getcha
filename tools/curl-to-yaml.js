const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');

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
    const urlMatch = curlCommand.match(/curl\s+['"]?([^'"]+)['"]?/);
    if (urlMatch) {
        const url = urlMatch[1];
        const urlObj = new URL(url);
        config.host = urlObj.host;
        config.url = urlObj.pathname;
        
        // 쿼리 파라미터 추출
        urlObj.searchParams.forEach((value, key) => {
            config.parameters[key] = value;
        });
    }

    // 메소드 추출
    const methodMatch = curlCommand.match(/-X\s+(\w+)/i);
    if (methodMatch) {
        config.method = methodMatch[1].toUpperCase();
    }

    // 헤더 추출
    const headerMatches = curlCommand.match(/-H\s+['"]([^'"]+)['"]/g);
    if (headerMatches) {
        headerMatches.forEach(header => {
            const [key, value] = header.replace(/-H\s+['"]/, '').replace(/['"]$/, '').split(': ');
            config.headers[key] = value;
        });
    }

    // 데이터 추출 (POST 요청의 경우)
    const dataMatch = curlCommand.match(/-d\s+['"]([^'"]+)['"]/);
    if (dataMatch) {
        try {
            const data = JSON.parse(dataMatch[1]);
            Object.assign(config.parameters, data);
        } catch (e) {
            console.warn('데이터 파싱 실패:', e.message);
        }
    }

    return config;
}

// 기존 config.yaml 백업
function backupConfig() {
    const rootConfigPath = path.join(__dirname, '..', 'config.yaml');
    if (fs.existsSync(rootConfigPath)) {
        const backupFileName = `config.backup.${uuidv4()}.yaml`;
        const backupPath = path.join(__dirname, '..', backupFileName);
        fs.copyFileSync(rootConfigPath, backupPath);
        console.log(`기존 설정 파일 백업 완료: ${backupFileName}`);
    }
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
        
        // YAML 형식으로 변환
        const yamlContent = yaml.dump({ apis }, {
            lineWidth: -1,
            noRefs: true,
            sortKeys: false
        });
        
        // 기존 config.yaml 백업
        backupConfig();
        
        // 루트 디렉토리에 config.yaml 저장
        const outputPath = path.join(__dirname, '..', outputFile);
        fs.writeFileSync(outputPath, yamlContent);
        
        console.log(`변환 완료: ${outputPath}`);
        console.log(`${apis.length}개의 API 설정이 생성되었습니다.`);
        
    } catch (error) {
        console.error('변환 중 오류 발생:', error.message);
        process.exit(1);
    }
}

// 커맨드 라인 인자 처리
const inputFile = process.argv[2];
const outputFile = process.argv[3] || 'config.yaml';

if (!inputFile) {
    console.error('사용법: node curl-to-yaml.js <입력_파일> [출력_파일]');
    process.exit(1);
}

convertCurlToYaml(inputFile, outputFile); 