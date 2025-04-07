const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');
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

// 프로젝트 루트 경로 가져오기
const projectRoot = path.join(__dirname, '..', '..');

// 기존 config.yaml 백업
function backupConfig() {
    const rootConfigPath = path.join(projectRoot, 'config.yaml');
    if (fs.existsSync(rootConfigPath)) {
        // 백업 디렉토리 생성
        const backupDir = path.join(projectRoot, 'config_backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const backupFileName = `config.backup.${uuidv4()}.yaml`;
        const backupPath = path.join(backupDir, backupFileName);
        fs.copyFileSync(rootConfigPath, backupPath);
        logger.info(`기존 설정 파일 백업 완료: ${backupFileName}`);
    }
}

// YAML 파일 저장
function saveYamlConfig(apis, outputPath) {
    // outputPath가 상대 경로인 경우 프로젝트 루트 기준으로 변경
    if (!path.isAbsolute(outputPath)) {
        outputPath = path.join(projectRoot, outputPath);
    }
    
    const yamlContent = yaml.dump({ apis }, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
    });
    
    fs.writeFileSync(outputPath, yamlContent);
    logger.info(`변환 완료: ${outputPath}`);
    logger.info(`${apis.length}개의 API 설정이 생성되었습니다.`);
}

module.exports = {
    backupConfig,
    saveYamlConfig
}; 