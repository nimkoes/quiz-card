import type { Category, DateFilterMode, FavoriteFilterMode } from '../types';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  onSelectOnly: (category: string) => void;
  onClearSelection: () => void;
  orderMode: 'sequential' | 'random';
  onOrderModeChange: (mode: 'sequential' | 'random') => void;
  dateFilterMode: DateFilterMode;
  onDateFilterModeChange: (mode: DateFilterMode) => void;
  favoriteFilterMode: FavoriteFilterMode;
  onFavoriteFilterModeChange: (mode: FavoriteFilterMode) => void;
  selectedUnderstandingLevels: Set<'low' | 'medium' | 'high'>;
  onToggleUnderstandingLevel: (level: 'low' | 'medium' | 'high') => void;
  onOpenTokenSettings: () => void;
  onOpenFavoritesManager?: () => void;
  hasToken: boolean;
}

export function CategorySidebar({
  categories,
  selectedCategories,
  onToggleCategory,
  onSelectOnly,
  onClearSelection,
  orderMode,
  onOrderModeChange,
  dateFilterMode,
  onDateFilterModeChange,
  favoriteFilterMode,
  onFavoriteFilterModeChange,
  selectedUnderstandingLevels,
  onToggleUnderstandingLevel,
  onOpenTokenSettings,
  onOpenFavoritesManager,
  hasToken,
}: CategorySidebarProps) {
  return (
    <div className="w-64 bg-pokemon-bg border-r-4 border-pokemon-border h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b-4 border-pokemon-border">
        <h1 className="text-xl font-bold text-pokemon-text">Quiz Card</h1>
      </div>
      
      {/* 카테고리 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          <button
            onClick={onClearSelection}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors font-bold ${
              selectedCategories.size === 0
                ? 'bg-pokemon-blue text-white'
                : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
            }`}
          >
            전체
          </button>
          {categories.map((category) => {
            const isSelected = selectedCategories.has(category.name);
            return (
              <div
                key={category.name}
                className="flex items-center gap-2"
              >
                <button
                  onClick={() => onToggleCategory(category.name)}
                  className={`flex-1 text-left px-4 py-2 rounded-lg transition-colors font-bold ${
                    isSelected
                      ? 'bg-pokemon-blue text-white'
                      : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <span className="text-xs opacity-75">({category.cards.length})</span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOnly(category.name);
                  }}
                  className="px-2 py-1 text-xs bg-pokemon-red text-white rounded hover:bg-red-600 transition-colors font-bold"
                  title="이 카테고리만 선택"
                >
                  only
                </button>
              </div>
            );
          })}
          {onOpenFavoritesManager && (
            <button
              onClick={onOpenFavoritesManager}
              className="w-full text-left px-4 py-2 rounded-lg transition-colors bg-pokemon-yellow text-pokemon-text hover:bg-yellow-400 border-4 border-pokemon-border font-bold"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>전체 카드 관리</span>
              </div>
            </button>
          )}
        </div>
      </div>
      
      {/* 설정 */}
      <div className="p-4 border-t-4 border-pokemon-border space-y-4">
        {/* 순서 모드 */}
        <div>
          <label className="block text-sm font-medium text-pokemon-text mb-2 font-bold">
            순서
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onOrderModeChange('sequential')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                orderMode === 'sequential'
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
            >
              순서대로
            </button>
            <button
              onClick={() => onOrderModeChange('random')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                orderMode === 'random'
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
            >
              랜덤
            </button>
          </div>
        </div>
        
        {/* 날짜 필터 모드 */}
        <div>
          <label className="block text-sm font-medium text-pokemon-text mb-2 font-bold">
            날짜 필터
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onDateFilterModeChange('all')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                dateFilterMode === 'all'
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => onDateFilterModeChange('week')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                dateFilterMode === 'week'
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
            >
              일주일
            </button>
          </div>
        </div>
        
        {/* 즐겨찾기 필터 모드 */}
        <div>
          <label className="block text-sm font-medium text-pokemon-text mb-2 font-bold">
            즐겨찾기 필터
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (hasToken) {
                  onFavoriteFilterModeChange('favorites');
                } else {
                  onOpenTokenSettings();
                }
              }}
              disabled={!hasToken}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                !hasToken
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : favoriteFilterMode === 'favorites'
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
              title={!hasToken ? 'GitHub 토큰을 설정해주세요' : undefined}
            >
              즐겨찾기
            </button>
            <button
              onClick={() => onFavoriteFilterModeChange('normal')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                favoriteFilterMode === 'normal'
                  ? 'bg-pokemon-blue text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
            >
              일반
            </button>
          </div>
        </div>
        
        {/* 이해도 필터 */}
        <div>
          <label className="block text-sm font-medium text-pokemon-text mb-2 font-bold">
            이해도
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onToggleUnderstandingLevel('low')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                selectedUnderstandingLevels.has('low')
                  ? 'bg-red-600 text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
            >
              하
            </button>
            <button
              onClick={() => onToggleUnderstandingLevel('medium')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                selectedUnderstandingLevels.has('medium')
                  ? 'bg-yellow-600 text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
            >
              중
            </button>
            <button
              onClick={() => onToggleUnderstandingLevel('high')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors font-bold ${
                selectedUnderstandingLevels.has('high')
                  ? 'bg-green-600 text-white'
                  : 'bg-pokemon-card text-pokemon-text hover:bg-pokemon-hover border-2 border-pokemon-border'
              }`}
            >
              상
            </button>
          </div>
        </div>
        
        {/* 토큰 설정 */}
        <button
          onClick={onOpenTokenSettings}
          className="w-full px-3 py-2 bg-pokemon-red text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-bold"
        >
          GitHub 토큰 설정
        </button>
      </div>
    </div>
  );
}

