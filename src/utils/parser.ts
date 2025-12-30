import type { Card, Category, ParsedData } from '../types';

/**
 * 파일명에서 index를 추출합니다.
 * {index}-{month}-{day}.md 형식: index 추출
 * {index}.md 형식: index를 1로 처리 (기본값)
 */
export function extractFileIndex(filename: string): number {
  const match = filename.match(/^(\d+)(?:-.*)?\.md$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 1; // 기본값
}

/**
 * 파일명에서 날짜 정보를 추출합니다.
 * {seq}-{month}_{day}.md 형식: month와 day 추출
 * 날짜 정보가 없으면 null 반환
 */
export function extractDateFromFilename(filename: string): { month: number; day: number } | null {
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
 * 날짜 구분자에서 날짜 정보를 추출합니다.
 * ===============11/21 형식: month와 day 추출
 * 날짜 정보가 없으면 null 반환
 */
function extractDateFromSeparator(line: string): { month: number; day: number } | null {
  // 정확히 15개의 = 뒤에 날짜가 오는 패턴
  // 앞뒤 공백은 무시 (trimmedLine으로 이미 처리됨)
  const match = line.match(/^={15}(\d+)\/(\d+)$/);
  if (match) {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    // 유효한 날짜 범위 확인 (1-12월, 1-31일)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day };
    }
  }
  return null;
}

/**
 * MD 파일 내용을 파싱하여 카드 배열로 변환
 */
export function parseMarkdown(content: string, category: string, filename: string): Card[] {
  const cards: Card[] = [];
  const lines = content.split('\n');
  
  let currentCard: { content: string[]; explanation?: string } | null = null;
  let currentDate: { month: number; day: number } | null = null;
  let dateCardIndex = new Map<string, number>(); // 날짜별 카드 인덱스 관리
  let inCard = false;
  let inExplanation = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // 날짜 구분자 처리
    const dateInfo = extractDateFromSeparator(trimmedLine);
    if (dateInfo) {
      currentDate = dateInfo;
      // 날짜별 인덱스 초기화는 필요 없음 (Map이 자동으로 관리)
      continue;
    }
    
    // 카드 시작
    if (trimmedLine === '<<<<<') {
      inCard = true;
      currentCard = { content: [] };
      inExplanation = false;
      continue;
    }
    
    // 카드 종료
    if (trimmedLine === '>>>>>') {
      if (currentCard && inCard) {
        const content = currentCard.content.join('\n').trim();
        const explanation = currentCard.explanation?.trim();
        
        if (content) {
          // 날짜별 카드 인덱스 가져오기 또는 초기화
          const dateKey = currentDate ? `${currentDate.month}-${currentDate.day}` : 'no-date';
          const cardIndex = dateCardIndex.get(dateKey) || 0;
          dateCardIndex.set(dateKey, cardIndex + 1);
          
          // 카드 ID 생성
          let cardId: string;
          if (currentDate) {
            cardId = `${category}-${currentDate.month}-${currentDate.day}-${cardIndex}`;
          } else {
            cardId = `${category}-${cardIndex}`;
          }
          
          cards.push({
            id: cardId,
            category,
            filename,
            content,
            explanation: explanation || undefined,
            index: cardIndex,
            month: currentDate?.month,
            day: currentDate?.day,
          });
        }
      }
      inCard = false;
      currentCard = null;
      inExplanation = false;
      continue;
    }
    
    // 카드 내부 처리
    if (inCard && currentCard) {
      // 추가 설명 시작
      if (trimmedLine === '###') {
        inExplanation = true;
        if (!currentCard.explanation) {
          currentCard.explanation = '';
        }
        continue;
      }
      
      // 추가 설명 영역
      if (inExplanation) {
        if (!currentCard.explanation) {
          currentCard.explanation = '';
        }
        currentCard.explanation += (currentCard.explanation ? '\n' : '') + line;
      } else {
        // 본문 영역
        currentCard.content.push(line);
      }
    }
  }
  
  return cards;
}

/**
 * public/content 폴더의 모든 MD 파일을 읽어서 파싱
 */
export async function loadAllCards(): Promise<ParsedData> {
  const categories: Category[] = [];
  const allCards: Card[] = [];
  
  try {
    const categoryNames = await getCategories();
    
    for (const categoryName of categoryNames) {
      const filenames = await getCategoryFiles(categoryName);
      const cards = await loadCategoryCards(categoryName, filenames);
      
      if (cards.length > 0) {
        categories.push({
          name: categoryName,
          cards,
        });
        allCards.push(...cards);
      }
    }
    
    return {
      categories,
      allCards,
    };
  } catch (error) {
    console.error('Failed to load cards:', error);
    return {
      categories: [],
      allCards: [],
    };
  }
}

/**
 * 특정 카테고리의 MD 파일을 읽어서 파싱
 * 단일 파일만 로드 (category.md 형식)
 */
export async function loadCategoryCards(category: string, filenames: string[]): Promise<Card[]> {
  const baseUrl = import.meta.env.BASE_URL;
  
  // 단일 파일만 로드 (category.md)
  const filename = `${category}.md`;
  try {
    const response = await fetch(`${baseUrl}content/${filename}`);
    if (!response.ok) {
      console.warn(`Failed to load ${filename}`);
      return [];
    }
    const content = await response.text();
    const cards = parseMarkdown(content, category, filename);
    return cards;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return [];
  }
}

/**
 * 카테고리 목록을 가져옵니다.
 * 빌드 시점에 생성된 index.json 파일에서 읽어옵니다.
 */
export async function getCategories(): Promise<string[]> {
  try {
    const baseUrl = import.meta.env.BASE_URL;
    const response = await fetch(`${baseUrl}content/index.json`);
    if (response.ok) {
      const data = await response.json();
      return data.categories || [];
    }
  } catch {
    console.warn('Failed to load category index, using empty list');
  }
  return [];
}

/**
 * 카테고리별 파일 목록을 가져옵니다.
 * 빌드 시점에 생성된 index.json 파일에서 읽어옵니다.
 * 단일 파일 구조에서는 더 이상 사용되지 않지만, 호환성을 위해 유지
 */
export async function getCategoryFiles(category: string): Promise<string[]> {
  // 단일 파일 구조에서는 빈 배열 반환 (loadCategoryCards에서 직접 파일명 사용)
  return [];
}

