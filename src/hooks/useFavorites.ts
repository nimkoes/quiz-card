import { useState, useEffect, useCallback } from 'react';
import * as gist from '../utils/gist';
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
        
        favorites.forEach(item => {
          ids.add(item.cardId);
          items.set(item.cardId, item);
        });
        
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

