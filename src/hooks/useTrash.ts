import { useState, useEffect, useCallback } from 'react';
import * as gist from '../utils/gist';
import { migrateCardId } from '../utils/migration';
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
        let needsMigration = false;
        const migratedTrash: TrashItem[] = [];
        
        trash.forEach(item => {
          // 마이그레이션이 필요한지 확인 (year가 없는 형식인지 체크)
          const migratedCardId = migrateCardId(item.cardId);
          if (migratedCardId && migratedCardId !== item.cardId) {
            // 마이그레이션이 필요한 경우
            needsMigration = true;
            migratedTrash.push({
              cardId: migratedCardId,
              addedAt: item.addedAt,
            });
            ids.add(migratedCardId);
            items.set(migratedCardId, {
              cardId: migratedCardId,
              addedAt: item.addedAt,
            });
          } else {
            // 이미 새 형식이거나 마이그레이션 불가능한 경우
            ids.add(item.cardId);
            items.set(item.cardId, item);
            migratedTrash.push(item);
          }
        });
        
        // 마이그레이션이 필요한 경우 Gist 업데이트
        if (needsMigration) {
          await gist.updateTrashGist(token, id, migratedTrash);
        }
        
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

