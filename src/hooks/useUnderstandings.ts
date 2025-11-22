import { useState, useEffect, useCallback } from 'react';
import * as gist from '../utils/gist';
import type { UnderstandingItem, UnderstandingLevel } from '../types';

export function useUnderstandings() {
  const [understandingItems, setUnderstandingItems] = useState<Map<string, UnderstandingItem>>(new Map());
  const [gistId, setGistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gist에서 이해도 로드
  const loadUnderstandings = useCallback(async () => {
    const token = gist.getToken();
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 저장된 Gist ID가 있으면 사용, 없으면 찾기
      let id = gist.getUnderstandingsGistId();
      if (!id) {
        id = await gist.findUnderstandingsGist(token);
        if (id) {
          gist.saveUnderstandingsGistId(id);
          setGistId(id);
        }
      } else {
        setGistId(id);
      }

      if (id) {
        const understandings = await gist.getUnderstandingsGist(token, id);
        const items = new Map<string, UnderstandingItem>();
        
        understandings.forEach(item => {
          items.set(item.cardId, item);
        });
        
        setUnderstandingItems(items);
      } else {
        // Gist가 없으면 빈 Map
        setUnderstandingItems(new Map());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load understandings');
      console.error('Failed to load understandings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 특정 카드의 이해도 설정
  const setUnderstanding = useCallback(async (cardId: string, level: UnderstandingLevel) => {
    const token = gist.getToken();
    if (!token) {
      setError('GitHub 토큰이 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newUnderstandingItems = new Map(understandingItems);
      
      if (level === null) {
        // 해제
        newUnderstandingItems.delete(cardId);
      } else {
        // 설정
        newUnderstandingItems.set(cardId, {
          cardId,
          level,
          updatedAt: new Date().toISOString(),
        });
      }

      const understandingsArray = Array.from(newUnderstandingItems.values());

      // Gist ID가 없으면 생성
      let id = gistId || gist.getUnderstandingsGistId();
      if (!id) {
        id = await gist.createUnderstandingsGist(token, understandingsArray);
        gist.saveUnderstandingsGistId(id);
        setGistId(id);
      } else {
        await gist.updateUnderstandingsGist(token, id, understandingsArray);
      }

      setUnderstandingItems(newUnderstandingItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update understanding');
      console.error('Failed to update understanding:', err);
    } finally {
      setLoading(false);
    }
  }, [understandingItems, gistId]);

  // 여러 카드의 이해도를 일괄 설정 (같은 이해도로)
  const setUnderstandings = useCallback(async (cardIds: string[], level: UnderstandingLevel) => {
    const token = gist.getToken();
    if (!token) {
      setError('GitHub 토큰이 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newUnderstandingItems = new Map(understandingItems);
      const now = new Date().toISOString();
      
      cardIds.forEach(cardId => {
        if (level === null) {
          // 해제
          newUnderstandingItems.delete(cardId);
        } else {
          // 설정
          newUnderstandingItems.set(cardId, {
            cardId,
            level,
            updatedAt: now,
          });
        }
      });

      const understandingsArray = Array.from(newUnderstandingItems.values());

      // Gist ID가 없으면 생성
      let id = gistId || gist.getUnderstandingsGistId();
      if (!id) {
        id = await gist.createUnderstandingsGist(token, understandingsArray);
        gist.saveUnderstandingsGistId(id);
        setGistId(id);
      } else {
        await gist.updateUnderstandingsGist(token, id, understandingsArray);
      }

      setUnderstandingItems(newUnderstandingItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update understandings');
      console.error('Failed to update understandings:', err);
    } finally {
      setLoading(false);
    }
  }, [understandingItems, gistId]);

  // 초기 로드
  useEffect(() => {
    loadUnderstandings();
  }, [loadUnderstandings]);

  return {
    understandingItems,
    setUnderstanding,
    setUnderstandings,
    loadUnderstandings,
    loading,
    error,
  };
}

