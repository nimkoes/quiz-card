import { useState, useMemo, useEffect } from 'react';
import type { Card, FavoriteItem } from '../types';

interface FavoritesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  allCards: Card[];
  favoriteItems: Map<string, FavoriteItem>;
  onRemoveFavorites: (cardIds: string[]) => void;
}

export function FavoritesManager({
  isOpen,
  onClose,
  allCards,
  favoriteItems,
  onRemoveFavorites,
}: FavoritesManagerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 즐겨찾기된 카드 목록 (등록일시 순으로 정렬)
  const favoriteCards = useMemo(() => {
    const cards: Array<{ card: Card; favoriteItem: FavoriteItem }> = [];
    
    favoriteItems.forEach((item, cardId) => {
      const card = allCards.find(c => c.id === cardId);
      if (card) {
        cards.push({ card, favoriteItem: item });
      }
    });

    // 등록일시 내림차순 정렬 (최신순)
    return cards.sort((a, b) => 
      new Date(b.favoriteItem.addedAt).getTime() - new Date(a.favoriteItem.addedAt).getTime()
    );
  }, [allCards, favoriteItems]);

  const handleSelectAll = () => {
    if (selectedIds.size === favoriteCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(favoriteCards.map(({ card }) => card.id)));
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
    if (selectedIds.size === 0) return;
    onRemoveFavorites(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            즐겨찾기 관리 ({favoriteCards.length}개)
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 액션 바 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === favoriteCards.length && favoriteCards.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">전체 선택</span>
            </label>
            {selectedIds.size > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.size}개 선택됨
              </span>
            )}
          </div>
          <button
            onClick={handleRemove}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
          >
            즐겨찾기 해제 ({selectedIds.size})
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {favoriteCards.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">즐겨찾기한 카드가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* PC 헤더 */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 p-2 text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-1">선택</div>
                <div className="col-span-2">카테고리</div>
                <div className="col-span-7">내용 미리보기</div>
                <div className="col-span-2">등록일시</div>
              </div>

              {favoriteCards.map(({ card, favoriteItem }) => (
                <div
                  key={card.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {/* 체크박스 */}
                  <div className="flex items-center md:col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(card.id)}
                      onChange={() => handleSelect(card.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* 카테고리 */}
                  <div className="md:col-span-2 flex items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {card.category}
                    </span>
                  </div>

                  {/* 내용 미리보기 */}
                  <div className="md:col-span-7 flex items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="md:hidden">내용: </span>
                      {truncateText(card.content, isMobile ? 35 : 150)}
                    </span>
                  </div>

                  {/* 등록일시 */}
                  <div className="md:col-span-2 flex items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(favoriteItem.addedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

