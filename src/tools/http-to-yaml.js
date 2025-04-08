const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const logger = require('../utils/logger');

async function convertHttpToYaml(inputFile, outputFile) {
  try {
    logger.info('HTTP 요청을 YAML로 변환을 시작합니다...');
    
    const content = await fs.readFile(inputFile, 'utf8');
    const lines = content.split('\n');
    const apis = [];
    let currentRequest = [];
    
    // 각 라인을 순회하면서 요청을 분리
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 새로운 요청의 시작인지 확인 (HTTP 메소드로 시작하는 라인)
      if (line.match(/^(GET|POST|PUT|DELETE|PATCH)\s/)) {
        // 이전 요청이 있다면 처리
        if (currentRequest.length > 0) {
          apis.push(parseHttpRequest(currentRequest));
        }
        // 새로운 요청 시작
        currentRequest = [line];
      } else {
        currentRequest.push(line);
      }
    }
    
    // 마지막 요청 처리
    if (currentRequest.length > 0) {
      apis.push(parseHttpRequest(currentRequest));
    }
    
    const yamlContent = yaml.dump({ apis }, { lineWidth: -1 });
    await fs.writeFile(outputFile, yamlContent);
    
    logger.info('YAML 파일이 생성되었습니다:');
    logger.info(yamlContent);
    
  } catch (error) {
    logger.error('변환 중 오류가 발생했습니다:', error);
    throw error;
  }
}

function parseHttpRequest(lines) {
  const firstLine = lines[0];
  
  // 메소드, 경로, 프로토콜 추출
  const [method, path, protocol] = firstLine.split(' ');
  
  // 헤더 추출
  const headers = {};
  let body = '';
  let bodyStartIndex = -1;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      bodyStartIndex = i + 1;
      break;
    }
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      headers[key.trim()] = valueParts.join(':').trim();
    }
  }
  
  // 요청 본문 추출
  if (bodyStartIndex !== -1 && bodyStartIndex < lines.length) {
    body = lines.slice(bodyStartIndex).join('\n').trim();
    try {
      // JSON 형식인 경우 파싱
      body = JSON.parse(body);
    } catch (e) {
      // JSON이 아닌 경우 문자열 그대로 사용
    }
  }
  
  // URL 구성
  const host = headers['Host'] || 'api.example.com';
  const url = `https://${host}${path}`;
  
  // ID 생성 (경로의 마지막 부분 사용)
  const pathParts = path.split('/').filter(p => p);
  const id = pathParts[pathParts.length - 1] || 'api';
  
  // 불필요한 헤더 제거
  delete headers['Host'];
  delete headers['Content-Length'];
  
  // 기본 매핑 추가
  const mapping = [
    { from: 'id', to: 'ID' },
    { from: 'title', to: '제목' },
    { from: 'content', to: '내용' }
  ];
  
  return {
    id: `${id}-${method.toLowerCase()}`,
    name: `${method} ${pathParts[pathParts.length - 1] || '/'}`,
    description: `${method} 요청을 ${host}에 보냅니다`,
    method,
    url,
    headers,
    mapping,
    ...(body && { body })
  };
}

// 커맨드 라인 인자 처리
const args = process.argv.slice(2);
if (args.length !== 2) {
  logger.error('입력 파일과 출력 파일을 모두 지정해주세요.');
  process.exit(1);
}

const [inputFile, outputFile] = args;
convertHttpToYaml(inputFile, outputFile).catch(error => {
  logger.error('프로그램 실행 중 오류가 발생했습니다:', error);
  process.exit(1);
}); 