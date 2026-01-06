import { extractDateFromFilename } from './parser';
import type { FavoriteItem, UnderstandingItem, TrashItem } from '../types';

/**
 * 기존 카드 ID를 새 형식으로 마이그레이션합니다.
 * 
 * 기존 형식 1: ${category}-${filename}-${cardIndex}
 * 기존 형식 2: ${category}-${month}-${day}-${cardIndex}
 * 새 형식 (날짜 있음): ${category}-${year}-${month}-${day}-${cardIndex}
 * 새 형식 (날짜 없음): ${category}-${cardIndex}
 * 
 * @param oldCardId 기존 카드 ID
 * @returns 새 카드 ID 또는 null (파싱 실패 시)
 */
export function migrateCardId(oldCardId: string): string | null {
  const parts = oldCardId.split('-');
  
  if (parts.length < 2) {
    return null; // 최소 category-index 형식이어야 함
  }
  
  const category = parts[0];
  const lastPart = parts[parts.length - 1];
  
  // 형식 1: category-month-day-index (4개 부분)
  // 예: "형법-11-18-3"
  if (parts.length === 4) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const cardIndex = parts[3];
    
    // 유효한 월/일인지 확인
    if (!isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      // 이미 연도가 포함되어 있는지 확인 (4자리 숫자)
      if (parts[1].length === 4) {
        // 이미 새 형식인 경우 그대로 반환
        return oldCardId;
      }
      // 연도 추가 (기본값 2025)
      return `${category}-2025-${month}-${day}-${cardIndex}`;
    }
  }
  
  // 형식 2: category-filename-cardIndex (3개 이상 부분)
  // 예: "한국사-001-11_21.md-0"
  // 예: "형법-001.md-3"
  if (parts.length >= 3) {
    const cardIndex = lastPart;
    const filename = parts.slice(1, -1).join('-');
    
    // filename에서 날짜 정보 추출
    const dateInfo = extractDateFromFilename(filename);
    
    if (dateInfo) {
      // 날짜가 있으면: category-year-month-day-index
      return `${category}-2025-${dateInfo.month}-${dateInfo.day}-${cardIndex}`;
    }
  }
  
  // 형식 3: category-index (2개 부분)
  // 예: "형법-0"
  if (parts.length === 2) {
    return oldCardId; // 날짜가 없으면 그대로 반환
  }
  
  return null;
}

/**
 * 즐겨찾기 데이터를 마이그레이션합니다.
 * 
 * @param oldData 기존 즐겨찾기 데이터
 * @returns 마이그레이션된 즐겨찾기 데이터
 */
export function migrateFavoritesData(oldData: FavoriteItem[]): FavoriteItem[] {
  const migrated: FavoriteItem[] = [];
  const failed: string[] = [];
  
  for (const item of oldData) {
    const newCardId = migrateCardId(item.cardId);
    if (newCardId) {
      migrated.push({
        cardId: newCardId,
        addedAt: item.addedAt,
      });
    } else {
      failed.push(item.cardId);
    }
  }
  
  if (failed.length > 0) {
    console.warn('Failed to migrate some favorite items:', failed);
  }
  
  return migrated;
}

/**
 * 이해도 데이터를 마이그레이션합니다.
 * 
 * @param oldData 기존 이해도 데이터
 * @returns 마이그레이션된 이해도 데이터
 */
export function migrateUnderstandingsData(oldData: UnderstandingItem[]): UnderstandingItem[] {
  const migrated: UnderstandingItem[] = [];
  const failed: string[] = [];
  
  for (const item of oldData) {
    const newCardId = migrateCardId(item.cardId);
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
  
  if (failed.length > 0) {
    console.warn('Failed to migrate some understanding items:', failed);
  }
  
  return migrated;
}

/**
 * 휴지통 데이터를 마이그레이션합니다.
 * 
 * @param oldData 기존 휴지통 데이터
 * @returns 마이그레이션된 휴지통 데이터
 */
export function migrateTrashData(oldData: TrashItem[]): TrashItem[] {
  const migrated: TrashItem[] = [];
  const failed: string[] = [];
  
  for (const item of oldData) {
    const newCardId = migrateCardId(item.cardId);
    if (newCardId) {
      migrated.push({
        cardId: newCardId,
        addedAt: item.addedAt,
      });
    } else {
      failed.push(item.cardId);
    }
  }
  
  if (failed.length > 0) {
    console.warn('Failed to migrate some trash items:', failed);
  }
  
  return migrated;
}

