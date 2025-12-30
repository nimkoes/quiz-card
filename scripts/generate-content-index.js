import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDir = path.join(__dirname, '../public/content');

/**
 * content 디렉토리에서 직접 .md 파일을 찾습니다 (단일 파일 구조)
 */
function findMdFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      // README.md와 index.md는 제외
      if (entry.name !== 'README.md' && entry.name !== 'index.md') {
        files.push(entry.name);
      }
    }
  }

  return files;
}

/**
 * 파일명에서 카테고리명을 추출합니다 (확장자 제거)
 */
function getCategoryFromFilename(filename) {
  return filename.replace(/\.md$/, '');
}

try {
  console.log('Scanning content directory...');
  const mdFiles = findMdFiles(contentDir);
  
  // 카테고리 목록 생성 (파일명에서 확장자 제거)
  const categories = mdFiles.map(getCategoryFromFilename).sort();
  
  // 호환성을 위해 files 구조도 유지 (빈 배열)
  const files = {};
  categories.forEach(category => {
    files[category] = [];
  });

  const indexData = {
    categories,
    files,
  };

  const indexPath = path.join(contentDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');

  console.log(`Found ${mdFiles.length} markdown files in ${categories.length} categories`);
  console.log(`Categories: ${categories.join(', ')}`);
  console.log(`Index file generated at: ${indexPath}`);
} catch (error) {
  console.error('Error generating content index:', error);
  process.exit(1);
}

