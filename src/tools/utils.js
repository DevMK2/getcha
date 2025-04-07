const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');

// 기존 config.yaml 백업
function backupConfig() {
    const rootConfigPath = path.join(__dirname, '..', 'config.yaml');
    if (fs.existsSync(rootConfigPath)) {
        // 백업 디렉토리 생성
        const backupDir = path.join(__dirname, '..', 'config_backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const backupFileName = `config.backup.${uuidv4()}.yaml`;
        const backupPath = path.join(backupDir, backupFileName);
        fs.copyFileSync(rootConfigPath, backupPath);
        console.log(`기존 설정 파일 백업 완료: ${backupFileName}`);
    }
}

// YAML 파일 저장
function saveYamlConfig(apis, outputPath) {
    const yamlContent = yaml.dump({ apis }, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
    });
    
    fs.writeFileSync(outputPath, yamlContent);
    console.log(`변환 완료: ${outputPath}`);
    console.log(`${apis.length}개의 API 설정이 생성되었습니다.`);
}

module.exports = {
    backupConfig,
    saveYamlConfig
}; 