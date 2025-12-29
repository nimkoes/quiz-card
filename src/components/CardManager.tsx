import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Card, FavoriteItem, UnderstandingItem, UnderstandingLevel, FavoriteFilterMode, DateFilterMode } from '../types';
import { extractFileIndex } from '../utils/parser';
import calendarIcon from '../assets/calendar.svg';

interface CardManagerProps {
  isOpen: boolean;
  onClose: () => void;
  allCards: Card[];
  favoriteItems: Map<string, FavoriteItem>;
  understandingItems: Map<string, UnderstandingItem>;
  categories: { name: string; cards: Card[] }[];
  onRemoveFavorites?: (cardIds: string[]) => void;
  onAddFavorites?: (cardIds: string[]) => void;
  onSetUnderstandings?: (cardIds: string[], level: UnderstandingLevel) => void;
  hasToken: boolean;
}

type SortOrder = 'asc' | 'desc' | null;

interface SortState {
  understanding: SortOrder;
  favorite: SortOrder;
  priority: Array<'understanding' | 'favorite'>;
}

export function CardManager({
  isOpen,
  onClose,
  allCards,
  favoriteItems,
  understandingItems,
  categories,
  onRemoveFavorites,
  onAddFavorites,
  onSetUnderstandings,
  hasToken,
}: CardManagerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<Set<string>>(new Set());
  const [selectedUnderstandingFilters, setSelectedUnderstandingFilters] = useState<Set<UnderstandingLevel>>(new Set());
  const [favoriteFilterMode, setFavoriteFilterMode] = useState<FavoriteFilterMode>('all');
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [sortState, setSortState] = useState<SortState>({
    understanding: null,
    favorite: null,
    priority: [],
  });
  const [previewCard, setPreviewCard] = useState<Card | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 필터링 및 정렬된 카드 목록
  const filteredAndSortedCards = useMemo(() => {
    let cards = allCards.map(card => ({
      card,
      favoriteItem: favoriteItems.get(card.id),
      understandingItem: understandingItems.get(card.id),
    }));

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cards = cards.filter(({ card }) =>
        card.content.toLowerCase().includes(query)
      );
    }

    // 카테고리 필터 (OR 조건: 선택된 카테고리 중 하나라도 일치하면 통과)
    if (selectedCategoryFilters.size > 0) {
      cards = cards.filter(({ card }) => selectedCategoryFilters.has(card.category));
    }

    // 이해도 필터 (OR 조건: 선택된 이해도 중 하나라도 일치하면 통과)
    if (selectedUnderstandingFilters.size > 0) {
      cards = cards.filter(({ understandingItem }) => {
        const level = understandingItem?.level;
        if (!level) return false;
        return selectedUnderstandingFilters.has(level);
      });
    }

    // 즐겨찾기 필터
    if (favoriteFilterMode === 'favorites') {
      cards = cards.filter(({ favoriteItem }) => favoriteItem !== undefined);
    } else if (favoriteFilterMode === 'normal') {
      cards = cards.filter(({ favoriteItem }) => favoriteItem === undefined);
    }
    // favoriteFilterMode === 'all'인 경우 필터링하지 않음

    // 일주일 필터 (각 카테고리별 최근 7개 파일)
    if (dateFilterMode === 'week') {
      // 카테고리별로 그룹화
      const cardsByCategory = new Map<string, typeof cards>();
      cards.forEach(item => {
        if (!cardsByCategory.has(item.card.category)) {
          cardsByCategory.set(item.card.category, []);
        }
        cardsByCategory.get(item.card.category)!.push(item);
      });
      
      // 각 카테고리별로 파일명으로 그룹화하고 최근 7개 파일 선택
      const filteredCards: typeof cards = [];
      cardsByCategory.forEach((categoryCards) => {
        // 파일명으로 그룹화
        const cardsByFile = new Map<string, typeof cards>();
        categoryCards.forEach(item => {
          if (!cardsByFile.has(item.card.filename)) {
            cardsByFile.set(item.card.filename, []);
          }
          cardsByFile.get(item.card.filename)!.push(item);
        });
        
        // 파일명에서 index 추출하여 정렬
        const files = Array.from(cardsByFile.entries())
          .map(([filename, fileCards]) => ({
            filename,
            index: extractFileIndex(filename),
            cards: fileCards,
          }))
          .sort((a, b) => b.index - a.index) // 내림차순 정렬
          .slice(0, 7); // 상위 7개 파일
        
        // 선택된 파일의 카드들 추가
        files.forEach(file => {
          filteredCards.push(...file.cards);
        });
      });
      
      cards = filteredCards;
    }

    // 정렬
    if (sortState.priority.length > 0) {
      // 복합 정렬 적용
      cards.sort((a, b) => {
        // priority 순서대로 정렬 적용
        for (const sortKey of sortState.priority) {
          let compareResult = 0;
          
          if (sortKey === 'understanding') {
            const order = sortState.understanding;
            if (order === null) continue;
            
            const levelA = a.understandingItem?.level;
            const levelB = b.understandingItem?.level;
            
            // 이해도가 없는 카드는 맨 뒤
            if (!levelA && !levelB) continue;
            if (!levelA) return 1;
            if (!levelB) return -1;
            
            // 이해도 순서: 상(high) → 중(medium) → 하(low)
            const levelOrder: Record<string, number> = { 'high': 1, 'medium': 2, 'low': 3 };
            const orderA = levelOrder[levelA] || 999;
            const orderB = levelOrder[levelB] || 999;
            
            compareResult = orderA - orderB;
            if (order === 'desc') compareResult = -compareResult;
          } else if (sortKey === 'favorite') {
            const order = sortState.favorite;
            if (order === null) continue;
            
            const favoriteA = a.favoriteItem;
            const favoriteB = b.favoriteItem;
            
            // 즐겨찾기가 없는 카드는 기본 순서대로 (나중에 처리)
            if (!favoriteA && !favoriteB) continue;
            if (!favoriteA) return 1;
            if (!favoriteB) return -1;
            
            const dateA = new Date(favoriteA.addedAt).getTime();
            const dateB = new Date(favoriteB.addedAt).getTime();
            compareResult = order === 'asc' ? dateA - dateB : dateB - dateA;
          }
          
          if (compareResult !== 0) {
            return compareResult;
          }
        }
        
        // 정렬 기준이 같으면 기본 순서 (카테고리별, 파일별, 인덱스별)
        if (a.card.category !== b.card.category) {
          return a.card.category.localeCompare(b.card.category);
        }
        if (a.card.filename !== b.card.filename) {
          return a.card.filename.localeCompare(b.card.filename);
        }
        return a.card.index - b.card.index;
      });
    } else {
      // 정렬이 없으면 기본 순서
      cards.sort((a, b) => {
        if (a.card.category !== b.card.category) {
          return a.card.category.localeCompare(b.card.category);
        }
        if (a.card.filename !== b.card.filename) {
          return a.card.filename.localeCompare(b.card.filename);
        }
        return a.card.index - b.card.index;
      });
    }

    return cards;
  }, [allCards, favoriteItems, understandingItems, searchQuery, selectedCategoryFilters, selectedUnderstandingFilters, favoriteFilterMode, dateFilterMode, sortState]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedCards.map(({ card }) => card.id)));
    }
  };

  const handleSelect = (cardId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedIds(newSelected);
  };

  const handleRemove = () => {
    if (selectedIds.size === 0 || !onRemoveFavorites) return;
    onRemoveFavorites(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleAdd = () => {
    if (selectedIds.size === 0 || !onAddFavorites) return;
    onAddFavorites(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}${month}${day} ${hours}:${minutes}`;
  };

  // 정렬 상태 변경 핸들러
  const handleSortClick = (sortKey: 'understanding' | 'favorite') => {
    setSortState(prev => {
      const currentOrder = prev[sortKey];
      let newOrder: SortOrder;
      
      // null → 'asc' → 'desc' → null 순환
      if (currentOrder === null) {
        newOrder = 'asc';
      } else if (currentOrder === 'asc') {
        newOrder = 'desc';
      } else {
        newOrder = null;
      }
      
      const newPriority = [...prev.priority];
      // 이미 priority에 있으면 제거
      const index = newPriority.indexOf(sortKey);
      if (index !== -1) {
        newPriority.splice(index, 1);
      }
      
      // null이 아니면 맨 앞에 추가 (우선순위)
      if (newOrder !== null) {
        newPriority.unshift(sortKey);
      }
      
      return {
        ...prev,
        [sortKey]: newOrder,
        priority: newPriority,
      };
    });
  };

  // 마크다운 렌더링 함수 (Card 컴포넌트와 동일한 로직)
  const renderMarkdown = (text: string): ReactNode => {
    const lines = text.split('\n');
    const result: ReactNode[] = [];

    const processInlineMarkdown = (text: string, keyPrefix: string = ''): ReactNode[] => {
      const parts: ReactNode[] = [];
      let remainingText = text;
      let key = 0;

      while (remainingText.length > 0) {
        let bestMatch: { start: number; end: number; type: string; content: string } | null = null;

        const boldItalicMatch = remainingText.match(/\*\*\*(.+?)\*\*\*/);
        if (boldItalicMatch && boldItalicMatch.index !== undefined) {
          bestMatch = {
            start: boldItalicMatch.index,
            end: boldItalicMatch.index + boldItalicMatch[0].length,
            type: 'boldItalic',
            content: boldItalicMatch[1],
          };
        }

        const boldMatch = remainingText.match(/\*\*(.+?)\*\*/);
        if (boldMatch && boldMatch.index !== undefined) {
          if (!bestMatch || boldMatch.index < bestMatch.start) {
            bestMatch = {
              start: boldMatch.index,
              end: boldMatch.index + boldMatch[0].length,
              type: 'bold',
              content: boldMatch[1],
            };
          }
        }

        const underlineMatch = remainingText.match(/__(.+?)__/);
        if (underlineMatch && underlineMatch.index !== undefined) {
          if (!bestMatch || underlineMatch.index < bestMatch.start) {
            bestMatch = {
              start: underlineMatch.index,
              end: underlineMatch.index + underlineMatch[0].length,
              type: 'underline',
              content: underlineMatch[1],
            };
          }
        }

        const italicMatch = remainingText.match(/\*([^*]+?)\*/);
        if (italicMatch && italicMatch.index !== undefined) {
          const beforeChar = italicMatch.index > 0 ? remainingText[italicMatch.index - 1] : '';
          const afterIndex = italicMatch.index + italicMatch[0].length;
          const afterChar = afterIndex < remainingText.length ? remainingText[afterIndex] : '';
          if (beforeChar !== '*' && afterChar !== '*') {
            if (!bestMatch || italicMatch.index < bestMatch.start) {
              bestMatch = {
                start: italicMatch.index,
                end: italicMatch.index + italicMatch[0].length,
                type: 'italic',
                content: italicMatch[1],
              };
            }
          }
        }

        if (bestMatch) {
          if (bestMatch.start > 0) {
            const beforeText = remainingText.substring(0, bestMatch.start);
            parts.push(...processInlineMarkdown(beforeText, `${keyPrefix}-before-${key}`));
          }

          const innerContent = processInlineMarkdown(bestMatch.content, `${keyPrefix}-inner-${key}`);

          if (bestMatch.type === 'boldItalic') {
            parts.push(
              <strong key={`${keyPrefix}-${key++}`} className="font-bold italic">
                {innerContent}
              </strong>
            );
          } else if (bestMatch.type === 'bold') {
            parts.push(
              <strong key={`${keyPrefix}-${key++}`} className="font-bold italic">
                {innerContent}
              </strong>
            );
          } else if (bestMatch.type === 'underline') {
            parts.push(
              <u key={`${keyPrefix}-${key++}`} className="underline decoration-pokemon-red decoration-2">
                {innerContent}
              </u>
            );
          } else if (bestMatch.type === 'italic') {
            parts.push(
              <em key={`${keyPrefix}-${key++}`} className="italic">
                {innerContent}
              </em>
            );
          }

          remainingText = remainingText.substring(bestMatch.end);
        } else {
          if (remainingText.length > 0) {
            parts.push(remainingText);
          }
          break;
        }
      }

      return parts.length > 0 ? parts : [text];
    };

    const buildList = (items: Array<{ level: number; content: string; index: number }>, startIndex: number): { nodes: ReactNode; endIndex: number } => {
      if (startIndex >= items.length) {
        return { nodes: null, endIndex: startIndex };
      }

      const currentLevel = items[startIndex].level;
      const listItems: ReactNode[] = [];
      let i = startIndex;

      while (i < items.length) {
        if (items[i].level < currentLevel) {
          break;
        }

        if (items[i].level === currentLevel) {
          const itemContent = processInlineMarkdown(items[i].content);
          const children: ReactNode[] = [];
          let nextIndex = i + 1;

          if (nextIndex < items.length && items[nextIndex].level > currentLevel) {
            const childResult = buildList(items, nextIndex);
            children.push(childResult.nodes);
            nextIndex = childResult.endIndex;
          }

          listItems.push(
            <li key={`item-${items[i].index}`}>
              {itemContent}
              {children.length > 0 && (
                <ul className="list-disc list-inside ml-6">
                  {children}
                </ul>
              )}
            </li>
          );

          i = nextIndex;
        } else {
          i++;
        }
      }

      return {
        nodes: (
          <ul key={`list-${startIndex}`} className="list-disc list-inside ml-2">
            {listItems}
          </ul>
        ),
        endIndex: i,
      };
    };

    const parsedItems: Array<{ type: 'list' | 'text' | 'blank' | 'table-row' | 'table-separator'; level?: number; content?: string; lineIndex: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;

      // 테이블 행 감지: | 또는 ||로 시작하고 끝나는 줄
      if ((trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) || 
          (trimmedLine.startsWith('||') && trimmedLine.endsWith('||'))) {
        // 구분선 감지: |---| 또는 |:---| 같은 패턴
        if (/^\|+[\s:|-]+\|+$/.test(trimmedLine)) {
          parsedItems.push({
            type: 'table-separator',
            lineIndex: i,
          });
        } else {
          // || 형식을 | 형식으로 정규화 (앞뒤 | 제거 후 다시 | 추가)
          let normalizedLine = trimmedLine;
          if (trimmedLine.startsWith('||') && trimmedLine.endsWith('||')) {
            normalizedLine = '|' + trimmedLine.slice(2, -2) + '|';
          }
          parsedItems.push({
            type: 'table-row',
            content: normalizedLine,
            lineIndex: i,
          });
        }
      } else if (trimmedLine.startsWith('- ')) {
        const listContent = trimmedLine.substring(2);
        const level = Math.floor(indent / 2);
        parsedItems.push({
          type: 'list',
          level,
          content: listContent,
          lineIndex: i,
        });
      } else if (trimmedLine) {
        parsedItems.push({
          type: 'text',
          content: trimmedLine,
          lineIndex: i,
        });
      } else {
        parsedItems.push({
          type: 'blank',
          lineIndex: i,
        });
      }
    }

    // 테이블 렌더링 함수
    const renderTable = (rows: string[], startIndex: number): ReactNode => {
      if (rows.length === 0) return null;

      // 셀 분리 함수
      const parseCells = (row: string): string[] => {
        // |로 구분된 셀들을 추출 (앞뒤 | 제거)
        const cells = row.slice(1, -1).split('|').map(cell => cell.trim());
        return cells;
      };

      // 첫 번째 행을 헤더로 처리
      const headerCells = parseCells(rows[0]);
      const headerRow = (
        <tr key="header">
          {headerCells.map((cell, idx) => (
            <th key={idx} className="border-2 border-pokemon-border px-3 py-2 bg-pokemon-cardAlt text-pokemon-text font-bold text-left">
              {processInlineMarkdown(cell)}
            </th>
          ))}
        </tr>
      );

      // 나머지 행들을 본문으로 처리
      const bodyRows = rows.slice(1).map((row, rowIdx) => {
        const cells = parseCells(row);
        return (
          <tr key={rowIdx}>
            {cells.map((cell, cellIdx) => (
              <td key={cellIdx} className="border-2 border-pokemon-border px-3 py-2 bg-pokemon-card text-pokemon-text">
                {processInlineMarkdown(cell)}
              </td>
            ))}
          </tr>
        );
      });

      return (
        <table key={`table-${startIndex}`} className="w-full border-collapse my-4">
          <thead>{headerRow}</thead>
          <tbody>{bodyRows}</tbody>
        </table>
      );
    };

    let i = 0;
    while (i < parsedItems.length) {
      const item = parsedItems[i];

      if (item.type === 'table-row' || item.type === 'table-separator') {
        // 연속된 테이블 행들을 수집
        const headerRows: string[] = [];
        const bodyRows: string[] = [];
        let foundSeparator = false;
        const startTableIndex = i;
        
        // 테이블 시작 위치로 돌아가서 수집 시작
        i = startTableIndex;
        
        while (i < parsedItems.length) {
          const currentItem = parsedItems[i];
          if (currentItem.type === 'table-row') {
            if (foundSeparator) {
              // 구분선 이후는 본문
              bodyRows.push(currentItem.content!);
            } else {
              // 구분선 이전은 헤더
              headerRows.push(currentItem.content!);
            }
            i++;
          } else if (currentItem.type === 'table-separator') {
            foundSeparator = true;
            i++;
          } else {
            // 테이블이 끝남
            break;
          }
        }

        // 테이블 렌더링
        if (headerRows.length > 0 || bodyRows.length > 0) {
          const allRows = foundSeparator 
            ? [...headerRows, ...bodyRows] 
            : headerRows.length > 0 
              ? [...headerRows, ...bodyRows] 
              : bodyRows;
          
          if (allRows.length > 0) {
            result.push(renderTable(allRows, item.lineIndex));
          }
        }
      } else if (item.type === 'list') {
        const listItems: Array<{ level: number; content: string; index: number }> = [];
        while (i < parsedItems.length && parsedItems[i].type === 'list') {
          listItems.push({
            level: parsedItems[i].level!,
            content: parsedItems[i].content!,
            index: parsedItems[i].lineIndex,
          });
          i++;
        }

        const listResult = buildList(listItems, 0);
        result.push(listResult.nodes);
      } else if (item.type === 'text') {
        result.push(
          <div key={`line-${item.lineIndex}`}>
            {processInlineMarkdown(item.content!)}
          </div>
        );
        i++;
      } else {
        result.push(<br key={`br-${item.lineIndex}`} />);
        i++;
      }
    }

    return <>{result}</>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-pokemon-bg rounded-lg shadow-xl max-w-6xl w-full h-[calc(100dvh-5rem)] md:h-[90vh] flex flex-col border-2 border-pokemon-border">
        {/* 헤더 */}
        <div className="p-1 md:p-4 border-b-2 border-pokemon-border flex items-center justify-between flex-shrink-0">
          <h2 className="text-[0.7rem] md:text-2xl font-bold text-pokemon-text">
            카드 관리 ({filteredAndSortedCards.length}개)
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-pokemon-text hover:text-pokemon-red transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 검색 및 필터 바 */}
        <div className="p-2 md:p-4 border-b-2 border-pokemon-border space-y-2 md:space-y-3 flex-shrink-0">
          {/* 검색 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="카드 내용으로 검색..."
              className="flex-1 px-3 py-2 border-2 border-pokemon-border rounded-lg bg-pokemon-card text-pokemon-text focus:outline-none focus:ring-2 focus:ring-pokemon-blue text-[0.7rem] md:text-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-2 text-pokemon-text hover:text-pokemon-red transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[0.7em] text-pokemon-text font-bold">필터</span>
            {/* 카테고리 필터 버튼들 */}
            {categories.map((cat) => {
              const isSelected = selectedCategoryFilters.has(cat.name);
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    const newSet = new Set(selectedCategoryFilters);
                    if (newSet.has(cat.name)) {
                      newSet.delete(cat.name);
                    } else {
                      newSet.add(cat.name);
                    }
                    setSelectedCategoryFilters(newSet);
                  }}
                  className={`px-1 py-1 border-2 border-pokemon-border rounded-lg text-[0.6em] transition-colors ${
                    isSelected
                      ? 'bg-pokemon-blue text-white'
                      : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
            {/* 이해도 필터 버튼들 */}
            <button
              onClick={() => {
                const newSet = new Set(selectedUnderstandingFilters);
                if (newSet.has('low')) {
                  newSet.delete('low');
                } else {
                  newSet.add('low');
                }
                setSelectedUnderstandingFilters(newSet);
              }}
              className={`px-2 py-1 border-2 border-pokemon-border rounded-lg text-[0.6em] transition-colors ${
                selectedUnderstandingFilters.has('low')
                  ? 'bg-red-600 text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover'
              }`}
            >
              하
            </button>
            <button
              onClick={() => {
                const newSet = new Set(selectedUnderstandingFilters);
                if (newSet.has('medium')) {
                  newSet.delete('medium');
                } else {
                  newSet.add('medium');
                }
                setSelectedUnderstandingFilters(newSet);
              }}
              className={`px-2 py-1 border-2 border-pokemon-border rounded-lg text-[0.6em] transition-colors ${
                selectedUnderstandingFilters.has('medium')
                  ? 'bg-yellow-600 text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover'
              }`}
            >
              중
            </button>
            <button
              onClick={() => {
                const newSet = new Set(selectedUnderstandingFilters);
                if (newSet.has('high')) {
                  newSet.delete('high');
                } else {
                  newSet.add('high');
                }
                setSelectedUnderstandingFilters(newSet);
              }}
              className={`px-2 py-1 border-2 border-pokemon-border rounded-lg text-[0.6em] transition-colors ${
                selectedUnderstandingFilters.has('high')
                  ? 'bg-green-600 text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover'
              }`}
            >
              상
            </button>
            {/* 즐겨찾기 필터 버튼 */}
            <button
              onClick={() => {
                if (hasToken) {
                  setFavoriteFilterMode(favoriteFilterMode === 'favorites' ? 'all' : 'favorites');
                }
              }}
              disabled={!hasToken}
              className={`px-2 py-1 border-2 border-pokemon-border rounded-lg text-[0.6em] transition-colors ${
                !hasToken
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : favoriteFilterMode === 'favorites'
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover'
              }`}
              title={!hasToken ? 'GitHub 토큰을 설정해주세요' : undefined}
            >
              ☆
            </button>
            {/* 일주일 필터 버튼 */}
            <button
              onClick={() => setDateFilterMode(dateFilterMode === 'week' ? 'all' : 'week')}
              className={`px-2 py-1 border-2 border-pokemon-border rounded-lg text-[0.6em] transition-colors ${
                dateFilterMode === 'week'
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover'
              }`}
            >
              일주일
            </button>
          </div>
          
          {/* 정렬 버튼 */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[0.7em] text-pokemon-text font-bold">정렬</span>
            <button
              onClick={() => handleSortClick('understanding')}
              className={`px-1 py-1 border-2 border-pokemon-border rounded-lg text-[0.6em] transition-colors flex items-center ${
                sortState.understanding === null
                  ? 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover'
                  : 'bg-pokemon-blue text-white'
              }`}
            >
              이해도
              {sortState.understanding === 'asc' && (
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
              {sortState.understanding === 'desc' && (
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            <button
              onClick={() => handleSortClick('favorite')}
              className={`px-1 py-1 border-2 border-pokemon-border rounded-lg text-[0.6em] transition-colors flex items-center ${
                sortState.favorite === null
                  ? 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover'
                  : 'bg-pokemon-blue text-white'
              }`}
            >
              ☆ 등록일
              {sortState.favorite === 'asc' && (
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
              {sortState.favorite === 'desc' && (
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 액션 바 */}
        {hasToken && ((onRemoveFavorites || onAddFavorites) || onSetUnderstandings) && (
          <div className="p-2 md:p-4 border-b-2 border-pokemon-border flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-[0.65rem] md:text-sm text-pokemon-text hover:text-pokemon-red transition-colors font-bold"
              >
                {selectedIds.size === filteredAndSortedCards.length && filteredAndSortedCards.length > 0
                  ? '전체 해제'
                  : '전체 선택'}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-[0.65rem] md:text-sm text-pokemon-text font-bold">
                  {selectedIds.size}
                </span>
              )}
            </div>
            <div className="flex gap-4 items-center">
              {/* 이해도 그룹 */}
              {onSetUnderstandings && (
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] md:text-sm text-pokemon-text font-bold">이해도</span>
                  <button
                    onClick={() => onSetUnderstandings(Array.from(selectedIds), null)}
                    disabled={selectedIds.size === 0}
                    className="px-2 py-1 bg-gray-300 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-[0.6rem] md:text-sm font-bold"
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => onSetUnderstandings(Array.from(selectedIds), 'low')}
                    disabled={selectedIds.size === 0}
                    className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-[0.6rem] md:text-sm font-bold"
                  >
                    하
                  </button>
                  <button
                    onClick={() => onSetUnderstandings(Array.from(selectedIds), 'medium')}
                    disabled={selectedIds.size === 0}
                    className="px-2 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-[0.6rem] md:text-sm font-bold"
                  >
                    중
                  </button>
                  <button
                    onClick={() => onSetUnderstandings(Array.from(selectedIds), 'high')}
                    disabled={selectedIds.size === 0}
                    className="px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-[0.6rem] md:text-sm font-bold"
                  >
                    상
                  </button>
                </div>
              )}
              
              {/* 즐겨찾기 그룹 */}
              {(onAddFavorites || onRemoveFavorites) && (
                <div className="flex items-center gap-2">
                  <span className="text-[0.6rem] md:text-sm text-pokemon-text font-bold">☆</span>
                  {onAddFavorites && (
                    <button
                      onClick={handleAdd}
                      disabled={selectedIds.size === 0}
                      className="px-2 py-1 bg-pokemon-blue text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-[0.6rem] md:text-sm font-bold"
                    >
                      +
                    </button>
                  )}
                  {onRemoveFavorites && (
                    <button
                      onClick={handleRemove}
                      disabled={selectedIds.size === 0}
                      className="px-2 py-1 bg-pokemon-red text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-[0.6rem] md:text-sm font-bold"
                    >
                      -
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 목록 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-4 bg-pokemon-bg">
          {filteredAndSortedCards.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[0.7rem] md:text-sm text-pokemon-text font-bold">
                {searchQuery || selectedCategoryFilters.size > 0 || selectedUnderstandingFilters.size > 0 ? '검색 결과가 없습니다.' : '카드가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 relative">
              {/* PC 헤더 */}
              <div className="hidden md:flex gap-4 p-2 text-sm font-medium text-pokemon-text border-b-2 border-pokemon-border bg-pokemon-bg sticky top-0 z-10 shadow-lg -mt-4 -mx-4 px-4 pt-4" style={{ backgroundColor: '#1a1a1a' }}>
                {hasToken && (
                  <div className="min-w-0" style={{ width: '50px', flexShrink: 0 }}>이해도</div>
                )}
                <div className="min-w-0" style={{ width: '75px', flexShrink: 0 }}>카테고리</div>
                <div className="flex-1 min-w-0">카드 내용</div>
                {hasToken && (
                  <div className="flex-1 min-w-0 text-right">즐겨찾기 등록일시</div>
                )}
                <div className="min-w-0" style={{ width: '60px', flexShrink: 0 }}></div>
              </div>

              {filteredAndSortedCards.map(({ card, favoriteItem, understandingItem }) => {
                const isSelected = selectedIds.has(card.id);
                const hasFavorite = !!favoriteItem;
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      if (hasToken && (onRemoveFavorites || onAddFavorites || onSetUnderstandings)) {
                        handleSelect(card.id);
                      }
                    }}
                    className={`flex gap-1 py-0.5 px-1 md:p-1 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-pokemon-blue text-white border-pokemon-red'
                        : hasFavorite
                        ? 'bg-pokemon-cardAlt border-pokemon-yellow hover:bg-pokemon-hover'
                        : 'bg-pokemon-card border-pokemon-border hover:bg-pokemon-hover'
                    } ${hasToken && (onRemoveFavorites || onAddFavorites || onSetUnderstandings) ? 'cursor-pointer' : ''}`}
                  >
                    {/* 이해도 */}
                    {hasToken && (
                      <div className="min-w-0 flex items-center" style={{ width: '15px', flexShrink: 0 }}>
                        <span className={`text-[0.6rem] md:text-sm font-medium ${isSelected ? 'text-yellow-200' : 'text-pokemon-yellow'}`}>
                          {understandingItem?.level === 'low' ? '하' : 
                           understandingItem?.level === 'medium' ? '중' : 
                           understandingItem?.level === 'high' ? '상' : '-'}
                        </span>
                      </div>
                    )}
                    
                    {/* 카테고리 */}
                    <div className="min-w-0 flex items-center" style={{ width: '51px', flexShrink: 0 }}>
                      <span className={`text-[0.65rem] md:text-sm font-medium truncate ${isSelected ? 'text-pokemon-borderAlt' : 'text-blue-400'}`}>
                        {card.category}
                      </span>
                    </div>

                    {/* 내용 미리보기 */}
                    <div className="flex-1 min-w-0 flex items-center">
                      <span className={`text-[0.6rem] md:text-sm truncate ${isSelected ? 'text-pokemon-yellow' : 'text-pokemon-borderAlt'}`}>
                        {truncateText(card.content, isMobile ? 50 : 100)}
                      </span>
                    </div>

                    {/* 등록일시 */}
                    {hasToken && (
                      <div className="min-w-0 flex items-center justify-end">
                        <span className={`text-[0.5rem] md:text-xs ${isSelected ? 'text-white' : 'text-pokemon-text'}`}>
                          {favoriteItem ? formatDate(favoriteItem.addedAt) : '-'}
                        </span>
                      </div>
                    )}

                    {/* 미리보기 버튼 */}
                    <div className="min-w-0 flex items-center justify-center" style={{ width: '25px', flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCard(card);
                        }}
                        className="text-[0.5rem] text-pokemon-blue hover:text-pokemon-red transition-colors text-lg"
                        title="카드 미리보기"
                      >
                        💬
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 카드 미리보기 모달 */}
      {previewCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewCard(null)}>
          <div className="bg-pokemon-bg rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col border-2 border-pokemon-border" onClick={(e) => e.stopPropagation()}>
            {/* 카드 내용 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-pokemon-text opacity-75 mb-2 flex items-center gap-2">
                    <span>내용</span>
                    {previewCard.month !== undefined && previewCard.day !== undefined && (
                      <span className="flex items-center gap-1">
                        <img src={calendarIcon} alt="calendar" className="w-[1.3rem] h-[1.3rem]" />
                        {previewCard.month} / {previewCard.day}
                      </span>
                    )}
                  </div>
                  <div className="text-pokemon-text text-[0.9em] leading-relaxed">
                    {renderMarkdown(previewCard.content)}
                  </div>
                </div>
                {previewCard.explanation && (
                  <div>
                    <div className="text-sm text-pokemon-text opacity-75 mb-2">추가 설명</div>
                    <div className="text-pokemon-text text-[0.7em] leading-relaxed">
                      {renderMarkdown(previewCard.explanation)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

