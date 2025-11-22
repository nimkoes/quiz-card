import { type ReactNode } from 'react';
import type { Card } from '../types';

interface CardProps {
  card: Card;
  onPrevious?: () => void;
  onNext?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  showExplanation?: boolean;
  onToggleExplanation?: () => void;
  hasToken?: boolean;
  onRequestToken?: () => void;
}

export function CardComponent({
  card,
  onPrevious,
  onNext,
  isFavorite = false,
  onToggleFavorite,
  showExplanation = false,
  onToggleExplanation,
  hasToken = false,
  onRequestToken,
}: CardProps) {
  const handleFavoriteClick = () => {
    if (!hasToken) {
      // 토큰이 없으면 토큰 요청 화면만 표시하고 종료
      if (onRequestToken) {
        onRequestToken();
      }
      return; // 토큰이 없으면 여기서 종료
    }
    // 토큰이 있을 때만 즐겨찾기 토글
    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  // 마크다운을 HTML로 변환 (굵은 글씨, 기울임, 목록)
  const renderMarkdown = (text: string): ReactNode => {
    const lines = text.split('\n');
    const result: ReactNode[] = [];

    // 재귀적으로 마크다운을 처리하는 함수
    const processInlineMarkdown = (text: string, keyPrefix: string = ''): ReactNode[] => {
      const parts: ReactNode[] = [];
      let remainingText = text;
      let key = 0;

      while (remainingText.length > 0) {
        let bestMatch: { start: number; end: number; type: string; content: string } | null = null;

        // 1. ***굵고기울임*** 패턴 찾기
        const boldItalicMatch = remainingText.match(/\*\*\*(.+?)\*\*\*/);
        if (boldItalicMatch && boldItalicMatch.index !== undefined) {
          bestMatch = {
            start: boldItalicMatch.index,
            end: boldItalicMatch.index + boldItalicMatch[0].length,
            type: 'boldItalic',
            content: boldItalicMatch[1],
          };
        }

        // 2. **굵은글씨** 패턴 찾기
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

        // 3. __밑줄__ 패턴 찾기
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

        // 4. *기울임* 패턴 찾기 (단, **나 ***의 일부가 아닌 경우만)
        const italicMatch = remainingText.match(/\*([^*]+?)\*/);
        if (italicMatch && italicMatch.index !== undefined) {
          // 앞뒤로 *가 없어야 함 (단일 *만)
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
          // 매치 앞의 일반 텍스트 추가 (재귀적으로 처리)
          if (bestMatch.start > 0) {
            const beforeText = remainingText.substring(0, bestMatch.start);
            parts.push(...processInlineMarkdown(beforeText, `${keyPrefix}-before-${key}`));
          }

          // 매치된 내용을 재귀적으로 처리 (중첩된 패턴 처리)
          const innerContent = processInlineMarkdown(bestMatch.content, `${keyPrefix}-inner-${key}`);

          // 매치된 내용 렌더링
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

          // 처리한 부분 제거
          remainingText = remainingText.substring(bestMatch.end);
        } else {
          // 매칭되는 패턴이 없으면 나머지 텍스트 추가하고 종료
          if (remainingText.length > 0) {
            parts.push(remainingText);
          }
          break;
        }
      }

      return parts.length > 0 ? parts : [text];
    };

    // 목록 구조를 재귀적으로 생성하는 함수
    const buildList = (items: Array<{ level: number; content: string; index: number }>, startIndex: number): { nodes: ReactNode; endIndex: number } => {
      if (startIndex >= items.length) {
        return { nodes: null, endIndex: startIndex };
      }

      const currentLevel = items[startIndex].level;
      const listItems: ReactNode[] = [];
      let i = startIndex;

      while (i < items.length) {
        if (items[i].level < currentLevel) {
          // 상위 레벨로 돌아갔으므로 종료
          break;
        }

        if (items[i].level === currentLevel) {
          // 현재 레벨의 항목
          const itemContent = processInlineMarkdown(items[i].content);
          const children: ReactNode[] = [];
          let nextIndex = i + 1;

          // 하위 레벨이 있는지 확인
          if (nextIndex < items.length && items[nextIndex].level > currentLevel) {
            const childResult = buildList(items, nextIndex);
            children.push(childResult.nodes);
            nextIndex = childResult.endIndex;
          }

          listItems.push(
            <li key={`item-${items[i].index}`}>
              {itemContent}
              {children.length > 0 && (
                <ul className="list-disc list-inside">
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

    // 모든 줄을 파싱하여 목록 항목과 일반 텍스트로 분류
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

    // 파싱된 항목들을 렌더링
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
        // 연속된 목록 항목들을 수집
        const listItems: Array<{ level: number; content: string; index: number }> = [];
        while (i < parsedItems.length && parsedItems[i].type === 'list') {
          listItems.push({
            level: parsedItems[i].level!,
            content: parsedItems[i].content!,
            index: parsedItems[i].lineIndex,
          });
          i++;
        }

        // 목록 구조 생성
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
        // 빈 줄
        result.push(<br key={`br-${item.lineIndex}`} />);
        i++;
      }
    }

    return <>{result}</>;
  };
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* 카드 본문 */}
      <div className="flex-1 min-h-0 flex items-stretch p-3 md:p-8 bg-pokemon-bg overflow-hidden">
        <div className="w-full max-w-4xl h-full flex items-stretch">
          <div className="bg-pokemon-card rounded-lg shadow-lg p-6 md:p-8 w-full h-full flex flex-col transition-transform duration-300 hover:shadow-xl border-4 border-pokemon-border overflow-hidden min-h-0">
            {/* 카드 내용 */}
            <div className="flex-1 overflow-y-auto scroll-smooth min-h-0">
              <div className="text-pokemon-text text-[0.9em] leading-relaxed font-medium">
                {renderMarkdown(card.content)}
              </div>
            </div>
            
            {/* 추가 설명 */}
            {card.explanation && (
              <div className="mt-4 pt-4 border-t-2 border-pokemon-border flex-shrink-0">
                <button
                  onClick={onToggleExplanation}
                  className="text-sm text-pokemon-blue hover:text-pokemon-red font-bold transition-colors"
                >
                  {showExplanation ? '추가 설명 숨기기' : '추가 설명 보기'}
                </button>
                {showExplanation && (
                  <div className="mt-2 p-4 bg-pokemon-cardAlt rounded-lg border-2 border-pokemon-border max-h-[40vh] overflow-y-auto">
                    <div className="text-pokemon-text text-[0.7em] leading-relaxed">
                      {renderMarkdown(card.explanation)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 네비게이션 및 액션 버튼 (PC 전용) */}
      <div className="hidden md:flex items-center justify-between p-4 bg-pokemon-bg border-t-4 border-pokemon-border flex-shrink-0">
        <button
          onClick={onPrevious}
          disabled={!onPrevious}
          className="px-4 py-2 bg-pokemon-red text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-bold shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          이전
        </button>
        
        <div className="flex items-center gap-4">
          {(onToggleFavorite || onRequestToken) && (
            <button
              onClick={handleFavoriteClick}
              disabled={!hasToken && !onRequestToken}
              className={`p-2 rounded-full transition-colors ${
                !hasToken
                  ? 'text-gray-400 cursor-not-allowed'
                  : isFavorite
                  ? 'text-pokemon-yellow hover:text-yellow-600'
                  : 'text-pokemon-text hover:text-pokemon-red'
              }`}
              aria-label={isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가'}
              title={!hasToken ? 'GitHub 토큰을 설정해주세요' : undefined}
            >
              <svg className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
        </div>
        
        <button
          onClick={onNext}
          disabled={!onNext}
          className="px-4 py-2 bg-pokemon-blue text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-bold shadow-md"
        >
          다음
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

