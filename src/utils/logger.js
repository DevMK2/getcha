const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: []
});

// 테스트 환경이 아닐 때만 파일 로그 추가
if (process.env.NODE_ENV !== 'test') {
  // 로그 디렉토리 생성
  const logDir = 'logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  logger.add(new winston.transports.File({ 
    filename: path.join(logDir, 'error.log'), 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: path.join(logDir, 'combined.log')
  }));
}

// 개발 환경이나 테스트 환경에서는 콘솔 로그 추가
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger; 