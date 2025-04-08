const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const logger = require('../utils/logger');

async function convertCurlToYaml(inputFile, outputFile) {
  try {
    logger.info('curl 명령어를 YAML로 변환을 시작합니다...');
    
    const content = await fs.readFile(inputFile, 'utf8');
    const lines = content.split('\n');
    const apis = [];
    let currentCommand = [];
    
    // 각 라인을 순회하면서 curl 명령어를 분리
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 새로운 curl 명령어의 시작인지 확인
      if (line.startsWith('curl ')) {
        // 이전 명령어가 있다면 처리
        if (currentCommand.length > 0) {
          apis.push(parseCurlCommand(currentCommand.join('\n')));
        }
        // 새로운 명령어 시작
        currentCommand = [line];
      } else if (line) { // 빈 라인이 아닌 경우에만 추가
        currentCommand.push(line);
      }
    }
    
    // 마지막 명령어 처리
    if (currentCommand.length > 0) {
      apis.push(parseCurlCommand(currentCommand.join('\n')));
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

function parseCurlCommand(curlCommand) {
  // URL 추출
  const urlMatch = curlCommand.match(/"([^"]+)"/);
  const url = urlMatch ? urlMatch[1] : '';
  const urlObj = new URL(url);
  
  // HTTP 메소드 추출
  const methodMatch = curlCommand.match(/-X\s+(\w+)/);
  const method = methodMatch ? methodMatch[1] : 'GET';
  
  // 헤더 추출
  const headers = {};
  const headerMatches = curlCommand.matchAll(/-H\s+"([^"]+)"/g);
  for (const match of headerMatches) {
    const [key, value] = match[1].split(': ');
    if (key !== 'Host') { // Host 헤더 제외
      headers[key] = value;
    }
  }
  
  // 요청 본문 추출
  let body = null;
  const bodyMatch = curlCommand.match(/-d\s+'([^']+)'/);
  if (bodyMatch) {
    try {
      body = JSON.parse(bodyMatch[1]);
    } catch (e) {
      body = bodyMatch[1];
    }
  }
  
  // ID 생성 (URL의 마지막 부분과 메소드를 조합)
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const id = pathParts.length > 0 
    ? `${pathParts[pathParts.length - 1]}-${method.toLowerCase()}`
    : `${pathParts[0] || 'root'}-${method.toLowerCase()}`;
  
  // 매핑 배열 생성 (한글 변환)
  const mapping = [
    { from: 'id', to: 'ID' },
    { from: 'title', to: '제목' },
    { from: 'content', to: '내용' }
  ];
  
  return {
    id,
    name: `${method} ${pathParts[pathParts.length - 1] || pathParts[0] || 'root'}`,
    description: `${method} 요청을 ${urlObj.host}에 보냅니다`,
    method,
    url,
    headers,
    ...(body && { body }),
    mapping
  };
}

module.exports = {
  convertCurlToYaml
};

// 커맨드 라인 인자 처리
const args = process.argv.slice(2);
if (args.length !== 2) {
  logger.error('입력 파일과 출력 파일을 모두 지정해주세요.');
  process.exit(1);
}

const [inputFile, outputFile] = args;
convertCurlToYaml(inputFile, outputFile).catch(error => {
  logger.error('프로그램 실행 중 오류가 발생했습니다:', error);
  process.exit(1);
}); 