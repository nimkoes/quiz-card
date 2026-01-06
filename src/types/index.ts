export interface Card {
  id: string; // 고유 ID: category-year-month-day-index 또는 category-index
  category: string;
  filename: string; // 카테고리명 또는 빈 문자열
  content: string; // 카드 본문 (<<<<< 와 >>>>> 사이의 내용, ### 제외)
  explanation?: string; // 추가 설명 (### 이후의 내용)
  index: number; // 날짜별 카드 인덱스
  year?: number; // 날짜 구분자에서 추출한 연도 정보
  month?: number; // 날짜 구분자에서 추출한 월 정보
  day?: number; // 날짜 구분자에서 추출한 일 정보
}

export interface Category {
  name: string;
  cards: Card[];
}

export interface ParsedData {
  categories: Category[];
  allCards: Card[];
}

export interface FavoriteItem {
  cardId: string;
  addedAt: string; // ISO 8601 형식의 날짜 문자열
}

export type OrderMode = 'sequential' | 'random';
export type FilterMode = 'all' | 'favorites'; // Deprecated: use DateFilterMode and FavoriteFilterMode instead
export type DateFilterMode = 'all' | 'week';
export type FavoriteFilterMode = 'all' | 'favorites' | 'normal';

export type UnderstandingLevel = 'low' | 'medium' | 'high' | null;

export interface UnderstandingItem {
  cardId: string;
  level: UnderstandingLevel;
  updatedAt: string; // ISO 8601 형식의 날짜 문자열
}

export interface TrashItem {
  cardId: string;
  addedAt: string; // ISO 8601 형식의 날짜 문자열
}

export type TrashFilterMode = 'all' | 'trash';

