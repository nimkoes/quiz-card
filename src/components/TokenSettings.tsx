import { useState } from 'react';
import * as gist from '../utils/gist';

interface TokenSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenSet: () => void;
}

export function TokenSettings({ isOpen, onClose, onTokenSet }: TokenSettingsProps) {
  const [token, setToken] = useState(gist.getToken() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) {
      setError('토큰을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const isValid = await gist.validateToken(token);
      if (!isValid) {
        setError('유효하지 않은 토큰입니다.');
        setLoading(false);
        return;
      }

      gist.setToken(token);
      setSuccess(true);
      
      // 토큰이 설정되면 즐겨찾기 다시 로드
      setTimeout(() => {
        onTokenSet();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '토큰 검증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    gist.removeToken();
    gist.saveGistId('');
    setToken('');
    setSuccess(true);
    setTimeout(() => {
      onTokenSet();
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-pokemon-bg rounded-lg shadow-xl max-w-md w-full p-6 border-2 border-pokemon-border">
        <h2 className="text-2xl font-bold mb-4 text-pokemon-text">
          GitHub 토큰 설정
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-pokemon-text mb-2 font-bold">
            Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            className="w-full px-3 py-2 border-2 border-pokemon-border rounded-lg bg-pokemon-card text-pokemon-text focus:outline-none focus:ring-2 focus:ring-pokemon-blue font-medium"
          />
          <p className="mt-2 text-xs text-pokemon-text">
            GitHub에서 Personal Access Token을 생성하여 입력하세요.
            <br />
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pokemon-blue hover:text-pokemon-red font-bold"
            >
              토큰 생성 페이지로 이동
            </a>
            <br />
            필요한 권한: gist (Gist 생성/수정)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 text-red-200 rounded-lg text-sm border-2 border-red-600 font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900 text-green-200 rounded-lg text-sm border-2 border-green-600 font-bold">
            {token ? '토큰이 저장되었습니다.' : '토큰이 삭제되었습니다.'}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-pokemon-blue text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
          {gist.getToken() && (
            <button
              onClick={handleRemove}
              className="px-4 py-2 bg-pokemon-red text-white rounded-lg hover:bg-red-600 transition-colors font-bold"
            >
              삭제
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-pokemon-card text-pokemon-text rounded-lg hover:bg-pokemon-hover border-2 border-pokemon-border transition-colors font-bold"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

