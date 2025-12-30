import { extractDateFromFilename } from './parser';
import type { FavoriteItem, UnderstandingItem, TrashItem } from '../types';

/**
 * 기존 카드 ID를 새 형식으로 마이그레이션합니다.
 * 
 * 기존 형식: ${category}-${filename}-${cardIndex}
 * 새 형식 (날짜 있음): ${category}-${month}-${day}-${cardIndex}
 * 새 형식 (날짜 없음): ${category}-${cardIndex}
 * 
 * @param oldCardId 기존 카드 ID
 * @returns 새 카드 ID 또는 null (파싱 실패 시)
 */
export function migrateCardId(oldCardId: string): string | null {
  // 카드 ID 형식: category-filename-cardIndex
  // 예: "한국사-001-11_21.md-0"
  // 예: "형법-001.md-3"
  
  const parts = oldCardId.split('-');
  if (parts.length < 3) {
    return null; // 최소 category-filename-index 형식이어야 함
  }
  
  // 마지막 부분이 cardIndex
  const cardIndex = parts[parts.length - 1];
  
  // 첫 번째 부분이 category
  const category = parts[0];
  
  // 중간 부분들이 filename (하이픈이 포함될 수 있음)
  const filename = parts.slice(1, -1).join('-');
  
  // filename에서 날짜 정보 추출
  const dateInfo = extractDateFromFilename(filename);
  
  if (dateInfo) {
    // 날짜가 있으면: category-month-day-index
    return `${category}-${dateInfo.month}-${dateInfo.day}-${cardIndex}`;
  } else {
    // 날짜가 없으면: category-index
    return `${category}-${cardIndex}`;
  }
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

