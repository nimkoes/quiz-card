export interface Card {
  id: string; // 고유 ID: category-filename-index
  category: string;
  filename: string;
  content: string; // 카드 본문 (<<<<< 와 >>>>> 사이의 내용, ### 제외)
  explanation?: string; // 추가 설명 (### 이후의 내용)
  index: number; // 파일 내 카드 인덱스
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
export type FilterMode = 'all' | 'favorites';

