import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.join(__dirname, '../public/content');

/**
 * 파일명에서 날짜 정보를 추출합니다.
 * {seq}-{month}_{day}.md 형식: month와 day 추출
 */
function extractDateFromFilename(filename) {
  const match = filename.match(/^\d+-(\d+)_(\d+)\.md$/);
  if (match) {
    return {
      month: parseInt(match[1], 10),
      day: parseInt(match[2], 10),
      seq: parseInt(filename.match(/^(\d+)/)?.[1] || '0', 10),
    };
  }
  return null;
}

/**
 * 카테고리 폴더의 모든 파일을 읽어서 하나로 합칩니다.
 */
function mergeCategoryFiles(categoryName) {
  const categoryDir = path.join(contentDir, categoryName);
  
  if (!fs.existsSync(categoryDir)) {
    console.warn(`Category directory not found: ${categoryName}`);
    return null;
  }
  
  // 파일 목록 읽기
  const files = fs.readdirSync(categoryDir)
    .filter(file => file.endsWith('.md') && file !== 'README.md' && file !== 'index.md')
    .map(file => {
      const filePath = path.join(categoryDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const dateInfo = extractDateFromFilename(file);
      
      return {
        filename: file,
        content,
        dateInfo,
        seq: dateInfo?.seq || 9999, // 날짜가 없으면 뒤로
      };
    })
    .sort((a, b) => {
      // 먼저 날짜로 정렬 (월, 일)
      if (a.dateInfo && b.dateInfo) {
        if (a.dateInfo.month !== b.dateInfo.month) {
          return a.dateInfo.month - b.dateInfo.month;
        }
        if (a.dateInfo.day !== b.dateInfo.day) {
          return a.dateInfo.day - b.dateInfo.day;
        }
      } else if (a.dateInfo && !b.dateInfo) {
        return -1;
      } else if (!a.dateInfo && b.dateInfo) {
        return 1;
      }
      // 날짜가 같거나 둘 다 없으면 seq로 정렬
      return a.seq - b.seq;
    });
  
  if (files.length === 0) {
    console.warn(`No files found in category: ${categoryName}`);
    return null;
  }
  
  // 파일들을 합치기
  const mergedContent = [];
  let currentDate = null;
  
  for (const file of files) {
    // 날짜 구분자 추가
    if (file.dateInfo) {
      const dateKey = `${file.dateInfo.month}-${file.dateInfo.day}`;
      const newDateKey = `${file.dateInfo.month}/${file.dateInfo.day}`;
      
      // 날짜가 변경되었을 때만 구분자 추가
      if (currentDate !== dateKey) {
        if (mergedContent.length > 0) {
          mergedContent.push(''); // 빈 줄 추가
        }
        mergedContent.push(`===============${newDateKey}`);
        mergedContent.push('');
        currentDate = dateKey;
      }
    } else {
      // 날짜가 없는 파일은 별도 처리 (일반적으로 없어야 함)
      if (mergedContent.length > 0) {
        mergedContent.push('');
      }
      mergedContent.push(`// 파일: ${file.filename} (날짜 정보 없음)`);
      mergedContent.push('');
    }
    
    // 파일 내용 추가
    mergedContent.push(file.content.trim());
    mergedContent.push(''); // 파일 간 빈 줄
  }
  
  return mergedContent.join('\n');
}

try {
  console.log('Merging category files...');
  
  // 카테고리 목록
  const categories = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  
  console.log(`Found categories: ${categories.join(', ')}`);
  
  // 각 카테고리 파일 합치기
  for (const category of categories) {
    console.log(`\nMerging ${category}...`);
    const mergedContent = mergeCategoryFiles(category);
    
    if (mergedContent) {
      const outputPath = path.join(contentDir, `${category}.md`);
      fs.writeFileSync(outputPath, mergedContent, 'utf-8');
      console.log(`✓ Created ${category}.md`);
    } else {
      console.warn(`✗ Failed to merge ${category}`);
    }
  }
  
  console.log('\n✓ All categories merged successfully!');
  console.log('\nNext steps:');
  console.log('1. Review the merged files');
  console.log('2. Delete the old category folders if everything looks good');
  console.log('3. Run: node scripts/generate-content-index.js');
} catch (error) {
  console.error('Error merging files:', error);
  process.exit(1);
}

