import { useState, useEffect, useCallback } from 'react';
import * as gist from '../utils/gist';
import type { TrashItem } from '../types';

export function useTrash() {
  const [trashIds, setTrashIds] = useState<Set<string>>(new Set());
  const [trashItems, setTrashItems] = useState<Map<string, TrashItem>>(new Map());
  const [gistId, setGistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gist에서 휴지통 로드
  const loadTrash = useCallback(async () => {
    const token = gist.getToken();
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 저장된 Gist ID가 있으면 사용, 없으면 찾기
      let id = gist.getTrashGistId();
      if (!id) {
        id = await gist.findTrashGist(token);
        if (id) {
          gist.saveTrashGistId(id);
          setGistId(id);
        }
      } else {
        setGistId(id);
      }

      if (id) {
        const trash = await gist.getTrashGist(token, id);
        const ids = new Set<string>();
        const items = new Map<string, TrashItem>();
        
        trash.forEach(item => {
          ids.add(item.cardId);
          items.set(item.cardId, item);
        });
        
        setTrashIds(ids);
        setTrashItems(items);
      } else {
        // Gist가 없으면 빈 Set
        setTrashIds(new Set());
        setTrashItems(new Map());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trash');
      console.error('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 휴지통 토글
  const toggleTrash = useCallback(async (cardId: string) => {
    const token = gist.getToken();
    if (!token) {
      setError('GitHub 토큰이 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newTrashIds = new Set(trashIds);
      const newTrashItems = new Map(trashItems);
      
      if (newTrashIds.has(cardId)) {
        newTrashIds.delete(cardId);
        newTrashItems.delete(cardId);
      } else {
        newTrashIds.add(cardId);
        newTrashItems.set(cardId, {
          cardId,
          addedAt: new Date().toISOString(),
        });
      }

      const trashArray = Array.from(newTrashItems.values());

      // Gist ID가 없으면 생성
      let id = gistId || gist.getTrashGistId();
      if (!id) {
        id = await gist.createTrashGist(token, trashArray);
        gist.saveTrashGistId(id);
        setGistId(id);
      } else {
        await gist.updateTrashGist(token, id, trashArray);
      }

      setTrashIds(newTrashIds);
      setTrashItems(newTrashItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trash');
      console.error('Failed to update trash:', err);
    } finally {
      setLoading(false);
    }
  }, [trashIds, trashItems, gistId]);

  // 초기 로드
  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  return {
    trashIds,
    trashItems,
    toggleTrash,
    loadTrash,
    loading,
    error,
  };
}

