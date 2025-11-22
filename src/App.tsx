import { useState, useEffect, useMemo } from 'react';
import { loadAllCards } from './utils/parser';
import { CategorySidebar } from './components/CategorySidebar';
import { MobileMenu } from './components/MobileMenu';
import { CardViewer } from './components/CardViewer';
import { TokenSettings } from './components/TokenSettings';
import { CardManager } from './components/CardManager';
import { useFavorites } from './hooks/useFavorites';
import * as gist from './utils/gist';
import type { Card, OrderMode, FilterMode } from './types';

function App() {
  const [categories, setCategories] = useState<{ name: string; cards: Card[] }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [orderMode, setOrderMode] = useState<OrderMode>('sequential');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTokenSettingsOpen, setIsTokenSettingsOpen] = useState(false);
  const [isFavoritesManagerOpen, setIsFavoritesManagerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tokenState, setTokenState] = useState(() => !!gist.getToken());
  const { favoriteIds, favoriteItems, toggleFavorite, addFavorites, removeFavorites, loadFavorites } = useFavorites();
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
    if (selectedCategories.size === 0) {
      // 선택된 카테고리가 없으면 전체 카드
      return categories.flatMap(cat => cat.cards);
    } else {
      // 선택된 카테고리들의 카드만
      return categories
        .filter(cat => selectedCategories.has(cat.name))
        .flatMap(cat => cat.cards);
    }
  }, [categories, selectedCategories]);

  // 모든 카드 목록 (즐겨찾기 관리용)
  const allCards = useMemo(() => {
    return categories.flatMap(cat => cat.cards);
  }, [categories]);

  // 토큰 설정 후 즐겨찾기 다시 로드
  const handleTokenSet = () => {
    setTokenState(!!gist.getToken());
    loadFavorites();
  };

  // 토큰이 없을 때 필터 모드를 'all'로 강제
  useEffect(() => {
    if (!hasToken && filterMode === 'favorites') {
      setFilterMode('all');
    }
  }, [hasToken, filterMode]);

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
      <div className="md:hidden bg-pokemon-bg border-b-4 border-pokemon-border p-4 flex items-center justify-between">
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
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            onOpenTokenSettings={() => setIsTokenSettingsOpen(true)}
            onOpenFavoritesManager={() => setIsFavoritesManagerOpen(true)}
            hasToken={hasToken}
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
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          onOpenTokenSettings={() => setIsTokenSettingsOpen(true)}
          onOpenFavoritesManager={() => setIsFavoritesManagerOpen(true)}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          hasToken={hasToken}
        />

        {/* 카드 뷰어 */}
        <div className="flex-1 overflow-hidden">
          <CardViewer
            cards={displayCards}
            orderMode={orderMode}
            filterMode={filterMode}
            favoriteIds={hasToken ? favoriteIds : new Set()}
            onToggleFavorite={toggleFavorite}
            hasToken={hasToken}
            onRequestToken={() => setIsTokenSettingsOpen(true)}
            onOpenFavoritesManager={() => setIsFavoritesManagerOpen(true)}
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
        categories={categories}
        onAddFavorites={hasToken ? addFavorites : undefined}
        onRemoveFavorites={hasToken ? removeFavorites : undefined}
        hasToken={hasToken}
      />
    </div>
  );
}

export default App;
