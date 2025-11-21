import type { Card, Category, ParsedData } from '../types';

/**
 * MD 파일 내용을 파싱하여 카드 배열로 변환
 */
export function parseMarkdown(content: string, category: string, filename: string): Card[] {
  const cards: Card[] = [];
  const lines = content.split('\n');
  
  let currentCard: { content: string[]; explanation?: string } | null = null;
  let cardIndex = 0;
  let inCard = false;
  let inExplanation = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 카드 시작
    if (line.trim() === '<<<<<') {
      inCard = true;
      currentCard = { content: [] };
      inExplanation = false;
      continue;
    }
    
    // 카드 종료
    if (line.trim() === '>>>>>') {
      if (currentCard && inCard) {
        const content = currentCard.content.join('\n').trim();
        const explanation = currentCard.explanation?.trim();
        
        if (content) {
          cards.push({
            id: `${category}-${filename}-${cardIndex}`,
            category,
            filename,
            content,
            explanation: explanation || undefined,
            index: cardIndex,
          });
          cardIndex++;
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
      if (line.trim() === '###') {
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
 */
export async function loadCategoryCards(category: string, filenames: string[]): Promise<Card[]> {
  const allCards: Card[] = [];
  
  for (const filename of filenames) {
    try {
      const response = await fetch(`/content/${category}/${filename}`);
      if (!response.ok) {
        console.warn(`Failed to load ${category}/${filename}`);
        continue;
      }
      const content = await response.text();
      const cards = parseMarkdown(content, category, filename);
      allCards.push(...cards);
    } catch (error) {
      console.error(`Error loading ${category}/${filename}:`, error);
    }
  }
  
  return allCards;
}

/**
 * 카테고리 목록을 가져옵니다.
 * 빌드 시점에 생성된 index.json 파일에서 읽어옵니다.
 */
export async function getCategories(): Promise<string[]> {
  try {
    const response = await fetch('/content/index.json');
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
 */
export async function getCategoryFiles(category: string): Promise<string[]> {
  try {
    const response = await fetch('/content/index.json');
    if (response.ok) {
      const data = await response.json();
      return data.files?.[category] || [];
    }
  } catch {
    console.warn(`Failed to load files for category ${category}`);
  }
  return [];
}

