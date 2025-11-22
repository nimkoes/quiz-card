import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Card, FavoriteItem } from '../types';

interface CardManagerProps {
  isOpen: boolean;
  onClose: () => void;
  allCards: Card[];
  favoriteItems: Map<string, FavoriteItem>;
  categories: { name: string; cards: Card[] }[];
  onRemoveFavorites?: (cardIds: string[]) => void;
  onAddFavorites?: (cardIds: string[]) => void;
  hasToken: boolean;
}

type SortMode = 'default' | 'favorite-asc' | 'favorite-desc';

export function CardManager({
  isOpen,
  onClose,
  allCards,
  favoriteItems,
  categories,
  onRemoveFavorites,
  onAddFavorites,
  hasToken,
}: CardManagerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('favorite-desc');
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
    }));

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cards = cards.filter(({ card }) =>
        card.content.toLowerCase().includes(query)
      );
    }

    // 카테고리 필터
    if (selectedCategoryFilter) {
      cards = cards.filter(({ card }) => card.category === selectedCategoryFilter);
    }

    // 정렬
    if (sortMode === 'default') {
      // 기본: 카드 순서대로 (카테고리별, 파일별, 인덱스별)
      cards.sort((a, b) => {
        if (a.card.category !== b.card.category) {
          return a.card.category.localeCompare(b.card.category);
        }
        if (a.card.filename !== b.card.filename) {
          return a.card.filename.localeCompare(b.card.filename);
        }
        return a.card.index - b.card.index;
      });
    } else if (sortMode === 'favorite-asc' || sortMode === 'favorite-desc') {
      // 즐겨찾기 등록일 기준 정렬
      const withFavorites = cards.filter(({ favoriteItem }) => favoriteItem);
      const withoutFavorites = cards.filter(({ favoriteItem }) => !favoriteItem);

      // 즐겨찾기 있는 카드들 정렬
      withFavorites.sort((a, b) => {
        const dateA = new Date(a.favoriteItem!.addedAt).getTime();
        const dateB = new Date(b.favoriteItem!.addedAt).getTime();
        return sortMode === 'favorite-asc' ? dateA - dateB : dateB - dateA;
      });

      // 즐겨찾기 없는 카드들은 기본 순서대로
      withoutFavorites.sort((a, b) => {
        if (a.card.category !== b.card.category) {
          return a.card.category.localeCompare(b.card.category);
        }
        if (a.card.filename !== b.card.filename) {
          return a.card.filename.localeCompare(b.card.filename);
        }
        return a.card.index - b.card.index;
      });

      // 즐겨찾기 있는 카드들 먼저, 그 다음 없는 카드들
      cards = [...withFavorites, ...withoutFavorites];
    }

    return cards;
  }, [allCards, favoriteItems, searchQuery, selectedCategoryFilter, sortMode]);

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
        <div className="p-2 md:p-4 border-b-2 border-pokemon-border flex items-center justify-between flex-shrink-0">
          <h2 className="text-[1.2rem] md:text-2xl font-bold text-pokemon-text">
            전체 카드 관리 ({filteredAndSortedCards.length}개)
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-pokemon-text hover:text-pokemon-red transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* 필터 및 정렬 */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* 카테고리 필터 */}
            <select
              value={selectedCategoryFilter || ''}
              onChange={(e) => setSelectedCategoryFilter(e.target.value || null)}
              className="px-3 py-2 border-2 border-pokemon-border rounded-lg bg-pokemon-card text-pokemon-text focus:outline-none focus:ring-2 focus:ring-pokemon-blue text-sm font-medium"
            >
              <option value="">전체 카테고리</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* 정렬 기준 */}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2 border-2 border-pokemon-border rounded-lg bg-pokemon-card text-pokemon-text focus:outline-none focus:ring-2 focus:ring-pokemon-blue text-sm font-medium"
            >
              <option value="favorite-desc">즐겨찾기 등록일 최신순</option>
              <option value="default">카드 순서대로</option>
              <option value="favorite-asc">즐겨찾기 등록일 오래된순</option>
            </select>
          </div>
        </div>

        {/* 액션 바 */}
        {hasToken && (onRemoveFavorites || onAddFavorites) && (
          <div className="p-2 md:p-4 border-b-2 border-pokemon-border flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-[0.7rem] md:text-sm text-pokemon-text hover:text-pokemon-red transition-colors font-bold"
              >
                {selectedIds.size === filteredAndSortedCards.length && filteredAndSortedCards.length > 0
                  ? '전체 해제'
                  : '전체 선택'}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-[0.7rem] md:text-sm text-pokemon-text font-bold">
                  {selectedIds.size}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {onAddFavorites && (
                <button
                  onClick={handleAdd}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-pokemon-blue text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-[0.7rem] md:text-sm font-bold"
                >
                  즐겨찾기 등록
                </button>
              )}
              {onRemoveFavorites && (
                <button
                  onClick={handleRemove}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-pokemon-red text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-[0.7rem] md:text-sm font-bold"
                >
                  즐겨찾기 해제
                </button>
              )}
            </div>
          </div>
        )}

        {/* 목록 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-4 bg-pokemon-bg">
          {filteredAndSortedCards.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[0.7rem] md:text-sm text-pokemon-text font-bold">
                {searchQuery || selectedCategoryFilter ? '검색 결과가 없습니다.' : '카드가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 relative">
              {/* PC 헤더 */}
              <div className="hidden md:flex gap-4 p-2 text-sm font-medium text-pokemon-text border-b-2 border-pokemon-border bg-pokemon-bg sticky top-0 z-10 shadow-lg -mt-4 -mx-4 px-4 pt-4" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="min-w-0" style={{ width: '75px', flexShrink: 0 }}>카테고리</div>
                <div className="flex-1 min-w-0">카드 내용</div>
                {hasToken && (
                  <div className="flex-1 min-w-0 text-right">즐겨찾기 등록일시</div>
                )}
                <div className="min-w-0" style={{ width: '60px', flexShrink: 0 }}></div>
              </div>

              {filteredAndSortedCards.map(({ card, favoriteItem }) => {
                const isSelected = selectedIds.has(card.id);
                const hasFavorite = !!favoriteItem;
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      if (hasToken && (onRemoveFavorites || onAddFavorites)) {
                        handleSelect(card.id);
                      }
                    }}
                    className={`flex gap-4 p-3 border-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-pokemon-blue text-white border-pokemon-red'
                        : hasFavorite
                        ? 'bg-pokemon-cardAlt border-pokemon-yellow hover:bg-pokemon-hover'
                        : 'bg-pokemon-card border-pokemon-border hover:bg-pokemon-hover'
                    } ${hasToken && (onRemoveFavorites || onAddFavorites) ? 'cursor-pointer' : ''}`}
                  >
                    {/* 카테고리 */}
                    <div className="min-w-0 flex items-center" style={{ width: '75px', flexShrink: 0 }}>
                      <span className={`text-[0.7rem] md:text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-pokemon-text'}`}>
                        {card.category}
                      </span>
                    </div>

                    {/* 내용 미리보기 */}
                    <div className="flex-1 min-w-0 flex items-center">
                      <span className={`text-[0.7rem] md:text-sm truncate ${isSelected ? 'text-white' : 'text-pokemon-text'}`}>
                        {truncateText(card.content, isMobile ? 35 : 100)}
                      </span>
                    </div>

                    {/* 등록일시 */}
                    {hasToken && (
                      <div className="flex-1 min-w-0 flex items-center justify-end">
                        <span className={`text-[0.6rem] md:text-xs ${isSelected ? 'text-white' : 'text-pokemon-text'}`}>
                          {favoriteItem ? formatDate(favoriteItem.addedAt) : '-'}
                        </span>
                      </div>
                    )}

                    {/* 미리보기 버튼 */}
                    <div className="min-w-0 flex items-center justify-center" style={{ width: '60px', flexShrink: 0 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCard(card);
                        }}
                        className="p-2 text-pokemon-blue hover:text-pokemon-red transition-colors text-lg"
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
                  <div className="text-sm text-pokemon-text opacity-75 mb-2">내용</div>
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

