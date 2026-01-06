import { useState, useEffect, useCallback } from 'react';
import * as gist from '../utils/gist';
import { migrateCardId } from '../utils/migration';
import type { FavoriteItem } from '../types';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteItems, setFavoriteItems] = useState<Map<string, FavoriteItem>>(new Map());
  const [gistId, setGistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gist에서 즐겨찾기 로드
  const loadFavorites = useCallback(async () => {
    const token = gist.getToken();
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 저장된 Gist ID가 있으면 사용, 없으면 찾기
      let id = gist.getGistId();
      if (!id) {
        id = await gist.findFavoritesGist(token);
        if (id) {
          gist.saveGistId(id);
          setGistId(id);
        }
      } else {
        setGistId(id);
      }

      if (id) {
        const favorites = await gist.getGist(token, id);
        const ids = new Set<string>();
        const items = new Map<string, FavoriteItem>();
        let needsMigration = false;
        const migratedFavorites: FavoriteItem[] = [];
        
        favorites.forEach(item => {
          // 마이그레이션이 필요한지 확인 (year가 없는 형식인지 체크)
          const migratedCardId = migrateCardId(item.cardId);
          if (migratedCardId && migratedCardId !== item.cardId) {
            // 마이그레이션이 필요한 경우
            needsMigration = true;
            migratedFavorites.push({
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
            migratedFavorites.push(item);
          }
        });
        
        // 마이그레이션이 필요한 경우 Gist 업데이트
        if (needsMigration) {
          await gist.updateGist(token, id, migratedFavorites);
        }
        
        setFavoriteIds(ids);
        setFavoriteItems(items);
      } else {
        // Gist가 없으면 빈 Set
        setFavoriteIds(new Set());
        setFavoriteItems(new Map());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async (cardId: string) => {
    const token = gist.getToken();
    if (!token) {
      setError('GitHub 토큰이 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newFavoriteIds = new Set(favoriteIds);
      const newFavoriteItems = new Map(favoriteItems);
      
      if (newFavoriteIds.has(cardId)) {
        newFavoriteIds.delete(cardId);
        newFavoriteItems.delete(cardId);
      } else {
        newFavoriteIds.add(cardId);
        newFavoriteItems.set(cardId, {
          cardId,
          addedAt: new Date().toISOString(),
        });
      }

      const favoritesArray = Array.from(newFavoriteItems.values());

      // Gist ID가 없으면 생성
      let id = gistId || gist.getGistId();
      if (!id) {
        id = await gist.createGist(token, favoritesArray);
        gist.saveGistId(id);
        setGistId(id);
      } else {
        await gist.updateGist(token, id, favoritesArray);
      }

      setFavoriteIds(newFavoriteIds);
      setFavoriteItems(newFavoriteItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorites');
      console.error('Failed to update favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [favoriteIds, favoriteItems, gistId]);

  // 즐겨찾기 일괄 삭제
  const removeFavorites = useCallback(async (cardIds: string[]) => {
    const token = gist.getToken();
    if (!token) {
      setError('GitHub 토큰이 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newFavoriteIds = new Set(favoriteIds);
      const newFavoriteItems = new Map(favoriteItems);
      
      cardIds.forEach(cardId => {
        newFavoriteIds.delete(cardId);
        newFavoriteItems.delete(cardId);
      });

      const favoritesArray = Array.from(newFavoriteItems.values());

      const id = gistId || gist.getGistId();
      if (id) {
        await gist.updateGist(token, id, favoritesArray);
      }

      setFavoriteIds(newFavoriteIds);
      setFavoriteItems(newFavoriteItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove favorites');
      console.error('Failed to remove favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [favoriteIds, favoriteItems, gistId]);

  // 초기 로드
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // 즐겨찾기 일괄 추가
  const addFavorites = useCallback(async (cardIds: string[]) => {
    const token = gist.getToken();
    if (!token) {
      setError('GitHub 토큰이 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newFavoriteIds = new Set(favoriteIds);
      const newFavoriteItems = new Map(favoriteItems);
      
      const now = new Date().toISOString();
      cardIds.forEach(cardId => {
        if (!newFavoriteIds.has(cardId)) {
          newFavoriteIds.add(cardId);
          newFavoriteItems.set(cardId, {
            cardId,
            addedAt: now,
          });
        }
      });

      const favoritesArray = Array.from(newFavoriteItems.values());

      // Gist ID가 없으면 생성
      let id = gistId || gist.getGistId();
      if (!id) {
        id = await gist.createGist(token, favoritesArray);
        gist.saveGistId(id);
        setGistId(id);
      } else {
        await gist.updateGist(token, id, favoritesArray);
      }

      setFavoriteIds(newFavoriteIds);
      setFavoriteItems(newFavoriteItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add favorites');
      console.error('Failed to add favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [favoriteIds, favoriteItems, gistId]);

  return {
    favoriteIds,
    favoriteItems,
    toggleFavorite,
    addFavorites,
    removeFavorites,
    loadFavorites,
    loading,
    error,
  };
}

