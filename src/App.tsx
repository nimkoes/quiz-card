import { useState, useEffect, useMemo } from 'react';
import { loadAllCards, extractFileIndex } from './utils/parser';
import { CategorySidebar } from './components/CategorySidebar';
import { MobileMenu } from './components/MobileMenu';
import { CardViewer } from './components/CardViewer';
import { TokenSettings } from './components/TokenSettings';
import { CardManager } from './components/CardManager';
import { useFavorites } from './hooks/useFavorites';
import { useUnderstandings } from './hooks/useUnderstandings';
import { useTrash } from './hooks/useTrash';
import * as gist from './utils/gist';
import type { Card, OrderMode, DateFilterMode, FavoriteFilterMode, TrashFilterMode } from './types';

function App() {
  const [categories, setCategories] = useState<{ name: string; cards: Card[] }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [orderMode, setOrderMode] = useState<OrderMode>('sequential');
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [favoriteFilterMode, setFavoriteFilterMode] = useState<FavoriteFilterMode>('all');
  const [trashFilterMode, setTrashFilterMode] = useState<TrashFilterMode>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTokenSettingsOpen, setIsTokenSettingsOpen] = useState(false);
  const [isFavoritesManagerOpen, setIsFavoritesManagerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tokenState, setTokenState] = useState(() => !!gist.getToken());
  const { favoriteIds, favoriteItems, toggleFavorite, addFavorites, removeFavorites, loadFavorites } = useFavorites();
  const { understandingItems, setUnderstanding, setUnderstandings, loadUnderstandings } = useUnderstandings();
  const { trashIds, trashItems, toggleTrash, loadTrash } = useTrash();
  const [selectedUnderstandingLevels, setSelectedUnderstandingLevels] = useState<Set<'low' | 'medium' | 'high'>>(new Set());
  const hasToken = tokenState;

  // 카드 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await loadAllCards();
        setCategories(data.categories);
      } catch (error) {
        console.error('Failed to load cards:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 선택된 카테고리에 따른 카드 목록
  const displayCards = useMemo(() => {
    let cards: Card[] = [];
    
    // 카테고리 필터링
    if (selectedCategories.size === 0) {
      // 선택된 카테고리가 없으면 전체 카드
      cards = categories.flatMap(cat => cat.cards);
    } else {
      // 선택된 카테고리들의 카드만
      cards = categories
        .filter(cat => selectedCategories.has(cat.name))
        .flatMap(cat => cat.cards);
    }
    
    // 일주일 필터 (각 카테고리별 최근 7개 파일)
    if (dateFilterMode === 'week') {
      // 카테고리별로 그룹화
      const cardsByCategory = new Map<string, Card[]>();
      cards.forEach(card => {
        if (!cardsByCategory.has(card.category)) {
          cardsByCategory.set(card.category, []);
        }
        cardsByCategory.get(card.category)!.push(card);
      });
      
      // 각 카테고리별로 파일명으로 그룹화하고 최근 7개 파일 선택
      const filteredCards: Card[] = [];
      cardsByCategory.forEach((categoryCards) => {
        // 파일명으로 그룹화
        const cardsByFile = new Map<string, Card[]>();
        categoryCards.forEach(card => {
          if (!cardsByFile.has(card.filename)) {
            cardsByFile.set(card.filename, []);
          }
          cardsByFile.get(card.filename)!.push(card);
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
    
    return cards;
  }, [categories, selectedCategories, dateFilterMode]);

  // 모든 카드 목록 (즐겨찾기 관리용)
  const allCards = useMemo(() => {
    return categories.flatMap(cat => cat.cards);
  }, [categories]);

  // 토큰 설정 후 즐겨찾기와 이해도, 휴지통 다시 로드
  const handleTokenSet = () => {
    setTokenState(!!gist.getToken());
    loadFavorites();
    loadUnderstandings();
    loadTrash();
  };

  // 토큰이 없을 때 즐겨찾기 필터 모드를 'all'로 강제 (단, 'normal'은 제외 - 토큰 없이도 동작 가능)
  useEffect(() => {
    if (!hasToken && favoriteFilterMode === 'favorites') {
      setFavoriteFilterMode('all');
    }
  }, [hasToken, favoriteFilterMode]);

  // 토큰이 없을 때 즐겨찾기 상태 초기화
  useEffect(() => {
    if (!hasToken) {
      // 토큰이 없으면 즐겨찾기 관련 상태를 초기화하지 않음 (로컬 상태는 유지)
      // 대신 UI에서만 표시하지 않도록 처리
    }
  }, [hasToken]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-pokemon-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pokemon-blue mx-auto mb-4"></div>
          <p className="text-pokemon-text font-bold">카드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-pokemon-bg">
      {/* 모바일 헤더 */}
      <div className="md:hidden bg-pokemon-bg border-b-4 border-pokemon-border flex items-center justify-between">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-pokemon-text hover:text-pokemon-red transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-pokemon-text">Quiz Card</h1>
        <div className="w-10"></div>
      </div>

      {/* 메인 레이아웃 */}
      <div className="flex-1 flex overflow-hidden">
        {/* PC 사이드바 */}
        <div className="hidden md:block">
          <CategorySidebar
            categories={categories}
            selectedCategories={selectedCategories}
            onToggleCategory={(category) => {
              const newSet = new Set(selectedCategories);
              if (newSet.has(category)) {
                newSet.delete(category);
              } else {
                newSet.add(category);
              }
              setSelectedCategories(newSet);
            }}
            onSelectOnly={(category) => {
              setSelectedCategories(new Set([category]));
            }}
            onClearSelection={() => {
              setSelectedCategories(new Set());
            }}
            orderMode={orderMode}
            onOrderModeChange={setOrderMode}
            dateFilterMode={dateFilterMode}
            onDateFilterModeChange={setDateFilterMode}
            favoriteFilterMode={favoriteFilterMode}
            onFavoriteFilterModeChange={setFavoriteFilterMode}
            selectedUnderstandingLevels={selectedUnderstandingLevels}
            onToggleUnderstandingLevel={(level) => {
              const newSet = new Set(selectedUnderstandingLevels);
              if (newSet.has(level)) {
                newSet.delete(level);
              } else {
                newSet.add(level);
              }
              setSelectedUnderstandingLevels(newSet);
            }}
            onOpenTokenSettings={() => setIsTokenSettingsOpen(true)}
            onOpenFavoritesManager={() => setIsFavoritesManagerOpen(true)}
            hasToken={hasToken}
            trashFilterMode={trashFilterMode}
            onTrashFilterModeChange={setTrashFilterMode}
          />
        </div>

        {/* 모바일 메뉴 */}
        <MobileMenu
          categories={categories}
          selectedCategories={selectedCategories}
          onToggleCategory={(category) => {
            const newSet = new Set(selectedCategories);
            if (newSet.has(category)) {
              newSet.delete(category);
            } else {
              newSet.add(category);
            }
            setSelectedCategories(newSet);
          }}
          onSelectOnly={(category) => {
            setSelectedCategories(new Set([category]));
          }}
          onClearSelection={() => {
            setSelectedCategories(new Set());
          }}
          orderMode={orderMode}
          onOrderModeChange={setOrderMode}
          dateFilterMode={dateFilterMode}
          onDateFilterModeChange={setDateFilterMode}
          favoriteFilterMode={favoriteFilterMode}
          onFavoriteFilterModeChange={setFavoriteFilterMode}
          selectedUnderstandingLevels={selectedUnderstandingLevels}
          onToggleUnderstandingLevel={(level) => {
            const newSet = new Set(selectedUnderstandingLevels);
            if (newSet.has(level)) {
              newSet.delete(level);
            } else {
              newSet.add(level);
            }
            setSelectedUnderstandingLevels(newSet);
          }}
          onOpenTokenSettings={() => setIsTokenSettingsOpen(true)}
          onOpenFavoritesManager={() => setIsFavoritesManagerOpen(true)}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          hasToken={hasToken}
          trashFilterMode={trashFilterMode}
          onTrashFilterModeChange={setTrashFilterMode}
        />

        {/* 카드 뷰어 */}
        <div className="flex-1 overflow-hidden">
          <CardViewer
            cards={displayCards}
            orderMode={orderMode}
            dateFilterMode={dateFilterMode}
            favoriteFilterMode={favoriteFilterMode}
            favoriteIds={hasToken ? favoriteIds : new Set()}
            onToggleFavorite={toggleFavorite}
            selectedUnderstandingLevels={selectedUnderstandingLevels}
            understandingItems={hasToken ? understandingItems : new Map()}
            onSetUnderstanding={hasToken ? setUnderstanding : undefined}
            hasToken={hasToken}
            onRequestToken={() => setIsTokenSettingsOpen(true)}
            onOpenFavoritesManager={() => setIsFavoritesManagerOpen(true)}
            trashIds={hasToken ? trashIds : new Set()}
            onToggleTrash={hasToken ? toggleTrash : undefined}
            trashFilterMode={trashFilterMode}
          />
        </div>
      </div>

      {/* 토큰 설정 모달 */}
      <TokenSettings
        isOpen={isTokenSettingsOpen}
        onClose={() => setIsTokenSettingsOpen(false)}
        onTokenSet={handleTokenSet}
      />

      {/* 전체 카드 관리 모달 */}
      <CardManager
        isOpen={isFavoritesManagerOpen}
        onClose={() => setIsFavoritesManagerOpen(false)}
        allCards={allCards}
        favoriteItems={favoriteItems}
        understandingItems={hasToken ? understandingItems : new Map()}
        trashItems={hasToken ? trashItems : new Map()}
        categories={categories}
        onAddFavorites={hasToken ? addFavorites : undefined}
        onRemoveFavorites={hasToken ? removeFavorites : undefined}
        onSetUnderstandings={hasToken ? setUnderstandings : undefined}
        hasToken={hasToken}
      />
    </div>
  );
}

export default App;
