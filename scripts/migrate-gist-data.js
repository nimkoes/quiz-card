import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentDir = path.join(__dirname, '../public/content');

/**
 * 파일명에서 날짜 정보를 추출합니다.
 * {seq}-{month}_{day}.md 형식: month와 day 추출
 * 날짜 정보가 없으면 null 반환
 */
function extractDateFromFilename(filename) {
  const match = filename.match(/^\d+-(\d+)_(\d+)\.md$/);
  if (match) {
    return {
      month: parseInt(match[1], 10),
      day: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * 실제 파일 목록을 스캔하여 파일명 매핑 테이블을 생성합니다.
 * {seq}.md 형식의 파일명을 실제 {seq}-{month}_{day}.md 형식으로 매핑
 */
function buildFilenameMapping() {
  const mapping = new Map(); // category -> { seq -> actualFilename }
  
  try {
    const categories = fs.readdirSync(contentDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    
    for (const category of categories) {
      const categoryDir = path.join(contentDir, category);
      const files = fs.readdirSync(categoryDir)
        .filter(file => file.endsWith('.md') && file !== 'README.md' && file !== 'index.md');
      
      const categoryMapping = new Map();
      
      for (const file of files) {
        // 파일명에서 seq 추출 (예: 001-11_18.md -> 001)
        const seqMatch = file.match(/^(\d+)(?:-.*)?\.md$/);
        if (seqMatch) {
          const seq = seqMatch[1];
          // 같은 seq가 여러 개 있을 수 있으므로, 가장 오래된 날짜의 파일을 선택
          if (!categoryMapping.has(seq)) {
            categoryMapping.set(seq, file);
          } else {
            // 이미 있으면 날짜 비교 (더 이른 날짜 선택)
            const existing = categoryMapping.get(seq);
            const existingDate = extractDateFromFilename(existing);
            const newDate = extractDateFromFilename(file);
            
            if (existingDate && newDate) {
              // 날짜 비교: 월이 작거나, 같은 월이면 일이 작은 것
              if (newDate.month < existingDate.month || 
                  (newDate.month === existingDate.month && newDate.day < existingDate.day)) {
                categoryMapping.set(seq, file);
              }
            } else if (newDate && !existingDate) {
              // 새 파일에 날짜가 있고 기존 파일에 없으면 새 파일 선택
              categoryMapping.set(seq, file);
            }
            // 둘 다 날짜가 없거나 기존 파일이 더 이르면 유지
          }
        }
      }
      
      mapping.set(category, categoryMapping);
    }
  } catch (error) {
    console.warn('Warning: Could not scan content directory:', error.message);
  }
  
  return mapping;
}

/**
 * 기존 카드 ID를 새 형식으로 마이그레이션합니다.
 */
function migrateCardId(oldCardId, filenameMapping) {
  const parts = oldCardId.split('-');
  if (parts.length < 3) {
    return null;
  }
  
  const cardIndex = parts[parts.length - 1];
  const category = parts[0];
  let filename = parts.slice(1, -1).join('-');
  
  // 날짜가 없는 파일명인 경우 실제 파일명으로 매핑
  if (!filename.match(/^\d+-\d+_\d+\.md$/)) {
    // {seq}.md 형식인지 확인
    const seqMatch = filename.match(/^(\d+)\.md$/);
    if (seqMatch) {
      const seq = seqMatch[1];
      const categoryMap = filenameMapping.get(category);
      if (categoryMap && categoryMap.has(seq)) {
        filename = categoryMap.get(seq);
      }
    }
    // example1.md 같은 경우는 매핑 불가
  }
  
  const dateInfo = extractDateFromFilename(filename);
  
  if (dateInfo) {
    return `${category}-${dateInfo.month}-${dateInfo.day}-${cardIndex}`;
  } else {
    // 날짜 정보를 찾을 수 없는 경우 (예: example1.md)
    return `${category}-${cardIndex}`;
  }
}

/**
 * 즐겨찾기 데이터를 마이그레이션합니다.
 */
function migrateFavoritesData(oldData, filenameMapping) {
  const migrated = [];
  const failed = [];
  
  for (const item of oldData) {
    const newCardId = migrateCardId(item.cardId, filenameMapping);
    if (newCardId) {
      migrated.push({
        cardId: newCardId,
        addedAt: item.addedAt,
      });
    } else {
      failed.push(item.cardId);
    }
  }
  
  return { migrated, failed };
}

/**
 * 이해도 데이터를 마이그레이션합니다.
 */
function migrateUnderstandingsData(oldData, filenameMapping) {
  const migrated = [];
  const failed = [];
  
  for (const item of oldData) {
    const newCardId = migrateCardId(item.cardId, filenameMapping);
    if (newCardId) {
      migrated.push({
        cardId: newCardId,
        level: item.level,
        updatedAt: item.updatedAt,
      });
    } else {
      failed.push(item.cardId);
    }
  }
  
  return { migrated, failed };
}

try {
  const rootDir = path.join(__dirname, '..');
  
  // 파일명 매핑 테이블 생성
  console.log('Building filename mapping from actual files...');
  const filenameMapping = buildFilenameMapping();
  console.log('✓ Filename mapping built');
  
  // 즐겨찾기 데이터 마이그레이션
  const favoritesPath = path.join(rootDir, 'quiz-card-favorites.json');
  if (fs.existsSync(favoritesPath)) {
    console.log('Migrating favorites data...');
    const favoritesData = JSON.parse(fs.readFileSync(favoritesPath, 'utf-8'));
    const { migrated, failed } = migrateFavoritesData(favoritesData, filenameMapping);
    
    const outputPath = path.join(rootDir, 'quiz-card-favorites-migrated.json');
    fs.writeFileSync(outputPath, JSON.stringify(migrated, null, 2), 'utf-8');
    
    console.log(`✓ Favorites: ${migrated.length} migrated, ${failed.length} failed`);
    if (failed.length > 0) {
      console.log('  Failed items:', failed);
    }
  } else {
    console.warn('quiz-card-favorites.json not found');
  }
  
  // 이해도 데이터 마이그레이션
  const understandingsPath = path.join(rootDir, 'quiz-card-understandings.json');
  if (fs.existsSync(understandingsPath)) {
    console.log('Migrating understandings data...');
    const understandingsData = JSON.parse(fs.readFileSync(understandingsPath, 'utf-8'));
    const { migrated, failed } = migrateUnderstandingsData(understandingsData, filenameMapping);
    
    const outputPath = path.join(rootDir, 'quiz-card-understandings-migrated.json');
    fs.writeFileSync(outputPath, JSON.stringify(migrated, null, 2), 'utf-8');
    
    console.log(`✓ Understandings: ${migrated.length} migrated, ${failed.length} failed`);
    if (failed.length > 0) {
      console.log('  Failed items:', failed);
    }
  } else {
    console.warn('quiz-card-understandings.json not found');
  }
  
  console.log('\nMigration completed!');
  console.log('Please review the migrated files and upload them to new Gists.');
} catch (error) {
  console.error('Error during migration:', error);
  process.exit(1);
}

