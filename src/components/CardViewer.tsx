import { useState, useEffect, useMemo } from 'react';
import type { Card, OrderMode, FilterMode } from '../types';
import { CardComponent } from './Card';

interface CardViewerProps {
  cards: Card[];
  orderMode: OrderMode;
  filterMode: FilterMode;
  favoriteIds: Set<string>;
  onToggleFavorite: (cardId: string) => void;
  hasToken: boolean;
  onRequestToken: () => void;
  onOpenFavoritesManager?: () => void;
}

export function CardViewer({
  cards,
  orderMode,
  filterMode,
  favoriteIds,
  onToggleFavorite,
  hasToken,
  onRequestToken,
  onOpenFavoritesManager,
}: CardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 필터링된 카드 목록
  const filteredCards = useMemo(() => {
    if (filterMode === 'favorites') {
      return cards.filter(card => favoriteIds.has(card.id));
    }
    return cards;
  }, [cards, filterMode, favoriteIds]);

  // 순서 모드에 따른 인덱스 배열
  const displayIndices = useMemo(() => {
    if (orderMode === 'random') {
      if (shuffledIndices.length !== filteredCards.length) {
        // 새로운 셔플 인덱스 생성
        const indices = Array.from({ length: filteredCards.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setShuffledIndices(indices);
        return indices;
      }
      return shuffledIndices;
    } else {
      return Array.from({ length: filteredCards.length }, (_, i) => i);
    }
  }, [filteredCards.length, orderMode, shuffledIndices]);

  // 필터 모드나 순서 모드가 변경되면 인덱스 리셋
  useEffect(() => {
    setCurrentIndex(0);
    setShowExplanation(false);
    if (orderMode === 'random') {
      setShuffledIndices([]);
    }
  }, [filterMode, orderMode, filteredCards.length]);

  // 랜덤 재셔플 함수
  const handleReshuffle = () => {
    const indices = Array.from({ length: filteredCards.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);
    setCurrentIndex(0);
    setShowExplanation(false);
  };

  const currentDisplayIndex = displayIndices[currentIndex];
  const currentCard = filteredCards[currentDisplayIndex];

  const handlePrevious = () => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setShowExplanation(false);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredCards.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setShowExplanation(false);
        setIsTransitioning(false);
      }, 150);
    }
  };

  if (filteredCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-pokemon-bg">
        <div className="text-center">
          <p className="text-pokemon-text text-lg font-bold">
            {filterMode === 'favorites' 
              ? '즐겨찾기한 카드가 없습니다.' 
              : '표시할 카드가 없습니다.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* 카드 카운터 및 즐겨찾기 관리 버튼 */}
      <div className="px-4 py-2 bg-pokemon-bg border-b-4 border-pokemon-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-sm text-pokemon-text font-bold">
            {currentIndex + 1} / {filteredCards.length}
          </div>
          {orderMode === 'random' && (
            <button
              onClick={handleReshuffle}
              className="p-1 text-pokemon-blue hover:text-pokemon-red transition-colors"
              title="순서 다시 섞기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
        {onOpenFavoritesManager && (
          <button
            onClick={onOpenFavoritesManager}
            className="text-sm text-pokemon-blue hover:text-pokemon-red font-bold transition-colors"
          >
            전체 카드 관리
          </button>
        )}
      </div>
      
      {/* 카드 컴포넌트 */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {currentCard && (
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <CardComponent
              card={currentCard}
              onPrevious={currentIndex > 0 && !isTransitioning ? handlePrevious : undefined}
              onNext={currentIndex < filteredCards.length - 1 && !isTransitioning ? handleNext : undefined}
              isFavorite={favoriteIds.has(currentCard.id)}
              onToggleFavorite={() => onToggleFavorite(currentCard.id)}
              showExplanation={showExplanation}
              onToggleExplanation={() => setShowExplanation(!showExplanation)}
              hasToken={hasToken}
              onRequestToken={onRequestToken}
            />
          </div>
        )}
      </div>
    </div>
  );
}

