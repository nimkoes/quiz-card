import { useState, useEffect, useMemo, useRef } from 'react';
import type { Card, OrderMode, DateFilterMode, FavoriteFilterMode, UnderstandingItem } from '../types';
import { CardComponent } from './Card';

interface CardViewerProps {
  cards: Card[];
  orderMode: OrderMode;
  dateFilterMode: DateFilterMode;
  favoriteFilterMode: FavoriteFilterMode;
  favoriteIds: Set<string>;
  onToggleFavorite: (cardId: string) => void;
  selectedUnderstandingLevels: Set<'low' | 'medium' | 'high'>;
  understandingItems: Map<string, UnderstandingItem>;
  onSetUnderstanding?: (cardId: string, level: 'low' | 'medium' | 'high' | null) => void;
  hasToken: boolean;
  onRequestToken: () => void;
  onOpenFavoritesManager?: () => void;
}

export function CardViewer({
  cards,
  orderMode,
  dateFilterMode,
  favoriteFilterMode,
  favoriteIds,
  onToggleFavorite,
  selectedUnderstandingLevels,
  understandingItems,
  onSetUnderstanding,
  hasToken,
  onRequestToken,
  onOpenFavoritesManager,
}: CardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 터치 슬라이드 관련 상태
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // 필터링된 카드 목록
  const filteredCards = useMemo(() => {
    let result = cards;
    
    // 즐겨찾기 필터
    if (favoriteFilterMode === 'favorites') {
      result = result.filter(card => favoriteIds.has(card.id));
    } else if (favoriteFilterMode === 'normal') {
      // 일반 필터: 즐겨찾기하지 않은 카드만
      result = result.filter(card => !favoriteIds.has(card.id));
    }
    // favoriteFilterMode === 'all'인 경우 필터링하지 않음
    
    // 이해도 필터
    if (selectedUnderstandingLevels.size > 0) {
      result = result.filter(card => {
        const understanding = understandingItems.get(card.id);
        if (!understanding || !understanding.level) {
          return false;
        }
        return selectedUnderstandingLevels.has(understanding.level);
      });
    }
    
    return result;
  }, [cards, favoriteFilterMode, favoriteIds, selectedUnderstandingLevels, understandingItems]);

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
  }, [dateFilterMode, favoriteFilterMode, orderMode, filteredCards.length]);

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

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null || isTransitioning) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    // 수평 이동이 수직 이동보다 클 때만 드래그로 인식
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsDragging(true);
      setDragOffset(deltaX);
      e.preventDefault(); // 스크롤 방지
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || !isDragging || isTransitioning) {
      setTouchStartX(null);
      setTouchStartY(null);
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const minSwipeDistance = 50;
    
    if (Math.abs(dragOffset) > minSwipeDistance) {
      if (dragOffset < 0) {
        // 왼쪽 스와이프 = 다음 카드
        handleNext();
      } else {
        // 오른쪽 스와이프 = 이전 카드
        handlePrevious();
      }
    }
    
    setTouchStartX(null);
    setTouchStartY(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleFavoriteClick = () => {
    if (!hasToken) {
      if (onRequestToken) {
        onRequestToken();
      }
      return;
    }
    if (currentCard) {
      onToggleFavorite(currentCard.id);
    }
  };

  if (filteredCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-pokemon-bg">
        <div className="text-center">
          <p className="text-pokemon-text text-lg font-bold">
            {favoriteFilterMode === 'favorites' 
              ? '즐겨찾기한 카드가 없습니다.' 
              : favoriteFilterMode === 'normal'
              ? '일반 카드가 없습니다.'
              : '표시할 카드가 없습니다.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* 카드 카운터, 즐겨찾기, 전체 카드 관리 버튼 */}
      <div className="px-4 py-2 bg-pokemon-bg border-b-4 border-pokemon-border flex items-center justify-between flex-shrink-0">
        {/* 왼쪽: 카드 번호 */}
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

        {/* 가운데: 즐겨찾기 및 이해도 버튼 (모바일) */}
        {currentCard && (
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={handleFavoriteClick}
              disabled={!hasToken && !onRequestToken}
              className={`p-2 rounded-full transition-colors ${
                !hasToken
                  ? 'text-gray-400 cursor-not-allowed'
                  : favoriteIds.has(currentCard.id)
                  ? 'text-pokemon-yellow hover:text-yellow-600'
                  : 'text-pokemon-text hover:text-pokemon-red'
              }`}
              aria-label={favoriteIds.has(currentCard.id) ? '즐겨찾기 제거' : '즐겨찾기 추가'}
              title={!hasToken ? 'GitHub 토큰을 설정해주세요' : undefined}
            >
              <svg className="w-6 h-6" fill={favoriteIds.has(currentCard.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            {onSetUnderstanding && (
              <>
                <button
                  onClick={() => onSetUnderstanding(currentCard.id, understandingItems.get(currentCard.id)?.level === 'low' ? null : 'low')}
                  disabled={!hasToken}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                    !hasToken
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : understandingItems.get(currentCard.id)?.level === 'low'
                      ? 'bg-red-600 text-white'
                      : 'bg-pokemon-card text-pokemon-text border border-pokemon-border'
                  }`}
                  title={!hasToken ? 'GitHub 토큰을 설정해주세요' : '하'}
                >
                  하
                </button>
                <button
                  onClick={() => onSetUnderstanding(currentCard.id, understandingItems.get(currentCard.id)?.level === 'medium' ? null : 'medium')}
                  disabled={!hasToken}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                    !hasToken
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : understandingItems.get(currentCard.id)?.level === 'medium'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-pokemon-card text-pokemon-text border border-pokemon-border'
                  }`}
                  title={!hasToken ? 'GitHub 토큰을 설정해주세요' : '중'}
                >
                  중
                </button>
                <button
                  onClick={() => onSetUnderstanding(currentCard.id, understandingItems.get(currentCard.id)?.level === 'high' ? null : 'high')}
                  disabled={!hasToken}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                    !hasToken
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : understandingItems.get(currentCard.id)?.level === 'high'
                      ? 'bg-green-600 text-white'
                      : 'bg-pokemon-card text-pokemon-text border border-pokemon-border'
                  }`}
                  title={!hasToken ? 'GitHub 토큰을 설정해주세요' : '상'}
                >
                  상
                </button>
              </>
            )}
          </div>
        )}

        {/* 오른쪽: 전체 카드 관리 버튼 */}
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
      <div 
        ref={cardContainerRef}
        className="flex-1 min-h-0 overflow-hidden relative touch-action-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ userSelect: isDragging ? 'none' : 'auto' }}
      >
        {currentCard && (
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
            style={{
              transform: isDragging ? `translateX(${dragOffset}px)` : 'none',
              transition: isDragging ? 'none' : 'opacity 300ms',
            }}
          >
            <CardComponent
              card={currentCard}
              onPrevious={currentIndex > 0 && !isTransitioning ? handlePrevious : undefined}
              onNext={currentIndex < filteredCards.length - 1 && !isTransitioning ? handleNext : undefined}
              isFavorite={favoriteIds.has(currentCard.id)}
              onToggleFavorite={() => onToggleFavorite(currentCard.id)}
              understandingLevel={understandingItems.get(currentCard.id)?.level || null}
              onSetUnderstanding={onSetUnderstanding ? (level) => onSetUnderstanding(currentCard.id, level) : undefined}
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

