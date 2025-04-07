const yaml = require('js-yaml');
const logger = require('../utils/logger');

function parseHttpRequest(request) {
  const lines = request.split('\n');
  let currentLine = 0;

  // 요청 라인 파싱
  const requestLine = lines[currentLine++].trim();
  const [method, fullUrl] = requestLine.split(' ');

  if (!method || !fullUrl) {
    throw new Error('잘못된 HTTP 요청 형식');
  }

  // URL에서 호스트와 경로 분리
  const url = new URL(fullUrl);
  const host = url.hostname;
  const path = url.pathname + url.search;

  // 헤더 파싱
  const headers = {};
  while (currentLine < lines.length && lines[currentLine].trim() !== '') {
    const line = lines[currentLine++].trim();
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      headers[key.trim()] = valueParts.join(':').trim();
    }
  }

  // 빈 줄 건너뛰기
  currentLine++;

  // 본문 파싱
  let body = null;
  if (currentLine < lines.length) {
    const bodyLines = [];
    while (currentLine < lines.length) {
      bodyLines.push(lines[currentLine++].trim());
    }
    try {
      body = JSON.parse(bodyLines.join(''));
    } catch (error) {
      // JSON이 아닌 경우 무시
    }
  }

  return {
    method,
    host,
    url: path,
    headers,
    parameters: {},
    mapping: [],
    body
  };
}

function convertHttpToYaml(content) {
  try {
    logger.info(`변환 시작: ${content}`);

    // HTTP 요청 블록 분리
    const blocks = content.split('\n\n');
    const requests = [];
    
    let currentRequest = [];
    for (const block of blocks) {
      if (block.trim().startsWith('{')) {
        // JSON 본문인 경우 이전 요청에 추가
        if (currentRequest.length > 0) {
          currentRequest.push(block);
          requests.push(currentRequest.join('\n\n'));
          currentRequest = [];
        }
      } else if (block.trim().match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/)) {
        // 새로운 HTTP 요청인 경우
        if (currentRequest.length > 0) {
          requests.push(currentRequest.join('\n\n'));
        }
        currentRequest = [block];
      } else if (block.trim()) {
        // 헤더나 다른 내용인 경우
        currentRequest.push(block);
      }
    }

    // 마지막 요청 추가
    if (currentRequest.length > 0) {
      requests.push(currentRequest.join('\n\n'));
    }

    logger.info(`요청 블록 발견: ${requests.length}개`);
    logger.info(`요청 내용: ${JSON.stringify(requests)}`);

    // 각 요청을 파싱
    const apis = requests.map(request => {
      logger.info(`파싱 시작: ${request}`);
      const config = parseHttpRequest(request);
      logger.info(`파싱 결과: ${JSON.stringify(config)}`);
      return config;
    });

    return { apis };
  } catch (error) {
    logger.error('변환 중 오류 발생:', error);
    throw error;
  }
}

module.exports = {
  convertHttpToYaml
}; 