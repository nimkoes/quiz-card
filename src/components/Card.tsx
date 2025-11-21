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
  return (
    <div className="flex flex-col h-full">
      {/* 카드 본문 */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-pokemon-bg">
        <div className="w-full max-w-4xl">
          <div className="bg-pokemon-card rounded-lg shadow-lg p-6 md:p-8 min-h-[300px] flex flex-col transition-transform duration-300 hover:shadow-xl border-4 border-pokemon-border">
            {/* 카드 내용 */}
            <div className="flex-1 overflow-y-auto mb-4 scroll-smooth">
              <div className="text-pokemon-text text-lg leading-relaxed whitespace-pre-wrap font-medium">
                {card.content}
              </div>
            </div>
            
            {/* 추가 설명 */}
            {card.explanation && (
              <div className="mt-4 pt-4 border-t-2 border-pokemon-border">
                <button
                  onClick={onToggleExplanation}
                  className="text-sm text-pokemon-blue hover:text-pokemon-red mb-2 font-bold transition-colors"
                >
                  {showExplanation ? '추가 설명 숨기기' : '추가 설명 보기'}
                </button>
                {showExplanation && (
                  <div className="mt-2 p-4 bg-pokemon-cardAlt rounded-lg border-2 border-pokemon-border">
                    <div className="text-pokemon-text text-sm leading-relaxed whitespace-pre-wrap">
                      {card.explanation}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 네비게이션 및 액션 버튼 */}
      <div className="flex items-center justify-between p-4 bg-pokemon-bg border-t-4 border-pokemon-border">
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

