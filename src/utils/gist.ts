const GIST_FILENAME = 'quiz-card-favorites.json';
const GIST_DESCRIPTION = 'Quiz Card Favorites';
const GIST_UNDERSTANDINGS_FILENAME = 'quiz-card-understandings.json';
const GIST_UNDERSTANDINGS_DESCRIPTION = 'Quiz Card Understandings';
const GIST_TRASH_FILENAME = 'quiz-card-trash.json';
const GIST_TRASH_DESCRIPTION = 'Quiz Card Trash';

export interface GistResponse {
  id: string;
  description?: string;
  files: {
    [key: string]: {
      content: string;
    };
  };
}

/**
 * GitHub Personal Access Token을 가져옵니다.
 */
export function getToken(): string | null {
  return localStorage.getItem('github_token');
}

/**
 * GitHub Personal Access Token을 저장합니다.
 */
export function setToken(token: string): void {
  localStorage.setItem('github_token', token);
}

/**
 * GitHub Personal Access Token을 삭제합니다.
 */
export function removeToken(): void {
  localStorage.removeItem('github_token');
}

/**
 * GitHub API를 사용하여 Gist를 생성합니다.
 */
export async function createGist(token: string, content: Array<{ cardId: string; addedAt: string }>): Promise<string> {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(content, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Gist');
  }

  const data: GistResponse = await response.json();
  return data.id;
}

/**
 * GitHub API를 사용하여 Gist를 업데이트합니다.
 */
export async function updateGist(token: string, gistId: string, content: Array<{ cardId: string; addedAt: string }>): Promise<void> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(content, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update Gist');
  }
}

/**
 * GitHub API를 사용하여 Gist를 조회합니다.
 */
export async function getGist(token: string, gistId: string): Promise<Array<{ cardId: string; addedAt: string }>> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get Gist');
  }

  const data: GistResponse = await response.json();
  const file = data.files[GIST_FILENAME];
  
  if (!file) {
    return [];
  }

  try {
    const parsed = JSON.parse(file.content);
    // 이전 형식 (string[])과 호환성 유지
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        // 이전 형식: string[] -> 새 형식으로 변환
        return parsed.map(cardId => ({
          cardId,
          addedAt: new Date().toISOString(),
        }));
      }
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 사용자의 모든 Gist를 조회하여 Quiz Card Favorites Gist를 찾습니다.
 */
export async function findFavoritesGist(token: string): Promise<string | null> {
  const response = await fetch('https://api.github.com/gists', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to list Gists');
  }

  const gists: GistResponse[] = await response.json();
  const favoritesGist = gists.find(
    gist => gist.files[GIST_FILENAME] && gist.description === GIST_DESCRIPTION
  );

  return favoritesGist?.id || null;
}

/**
 * 토큰의 유효성을 검증합니다.
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Gist ID를 localStorage에 저장합니다.
 */
export function saveGistId(gistId: string): void {
  localStorage.setItem('favorites_gist_id', gistId);
}

/**
 * localStorage에서 Gist ID를 가져옵니다.
 */
export function getGistId(): string | null {
  return localStorage.getItem('favorites_gist_id');
}

/**
 * GitHub API를 사용하여 이해도 Gist를 생성합니다.
 */
export async function createUnderstandingsGist(token: string, content: Array<{ cardId: string; level: 'low' | 'medium' | 'high' | null; updatedAt: string }>): Promise<string> {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_UNDERSTANDINGS_DESCRIPTION,
      public: false,
      files: {
        [GIST_UNDERSTANDINGS_FILENAME]: {
          content: JSON.stringify(content, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Understandings Gist');
  }

  const data: GistResponse = await response.json();
  return data.id;
}

/**
 * GitHub API를 사용하여 이해도 Gist를 업데이트합니다.
 */
export async function updateUnderstandingsGist(token: string, gistId: string, content: Array<{ cardId: string; level: 'low' | 'medium' | 'high' | null; updatedAt: string }>): Promise<void> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_UNDERSTANDINGS_DESCRIPTION,
      files: {
        [GIST_UNDERSTANDINGS_FILENAME]: {
          content: JSON.stringify(content, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update Understandings Gist');
  }
}

/**
 * GitHub API를 사용하여 이해도 Gist를 조회합니다.
 */
export async function getUnderstandingsGist(token: string, gistId: string): Promise<Array<{ cardId: string; level: 'low' | 'medium' | 'high' | null; updatedAt: string }>> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get Understandings Gist');
  }

  const data: GistResponse = await response.json();
  const file = data.files[GIST_UNDERSTANDINGS_FILENAME];
  
  if (!file) {
    return [];
  }

  try {
    const parsed = JSON.parse(file.content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 사용자의 모든 Gist를 조회하여 Quiz Card Understandings Gist를 찾습니다.
 */
export async function findUnderstandingsGist(token: string): Promise<string | null> {
  const response = await fetch('https://api.github.com/gists', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to list Gists');
  }

  const gists: GistResponse[] = await response.json();
  const understandingsGist = gists.find(
    gist => gist.files[GIST_UNDERSTANDINGS_FILENAME] && gist.description === GIST_UNDERSTANDINGS_DESCRIPTION
  );

  return understandingsGist?.id || null;
}

/**
 * 이해도 Gist ID를 localStorage에 저장합니다.
 */
export function saveUnderstandingsGistId(gistId: string): void {
  localStorage.setItem('understandings_gist_id', gistId);
}

/**
 * localStorage에서 이해도 Gist ID를 가져옵니다.
 */
export function getUnderstandingsGistId(): string | null {
  return localStorage.getItem('understandings_gist_id');
}

/**
 * GitHub API를 사용하여 휴지통 Gist를 생성합니다.
 */
export async function createTrashGist(token: string, content: Array<{ cardId: string; addedAt: string }>): Promise<string> {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_TRASH_DESCRIPTION,
      public: false,
      files: {
        [GIST_TRASH_FILENAME]: {
          content: JSON.stringify(content, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Trash Gist');
  }

  const data: GistResponse = await response.json();
  return data.id;
}

/**
 * GitHub API를 사용하여 휴지통 Gist를 업데이트합니다.
 */
export async function updateTrashGist(token: string, gistId: string, content: Array<{ cardId: string; addedAt: string }>): Promise<void> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_TRASH_DESCRIPTION,
      files: {
        [GIST_TRASH_FILENAME]: {
          content: JSON.stringify(content, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update Trash Gist');
  }
}

/**
 * GitHub API를 사용하여 휴지통 Gist를 조회합니다.
 */
export async function getTrashGist(token: string, gistId: string): Promise<Array<{ cardId: string; addedAt: string }>> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get Trash Gist');
  }

  const data: GistResponse = await response.json();
  const file = data.files[GIST_TRASH_FILENAME];
  
  if (!file) {
    return [];
  }

  try {
    const parsed = JSON.parse(file.content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 사용자의 모든 Gist를 조회하여 Quiz Card Trash Gist를 찾습니다.
 */
export async function findTrashGist(token: string): Promise<string | null> {
  const response = await fetch('https://api.github.com/gists', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to list Gists');
  }

  const gists: GistResponse[] = await response.json();
  const trashGist = gists.find(
    gist => gist.files[GIST_TRASH_FILENAME] && gist.description === GIST_TRASH_DESCRIPTION
  );

  return trashGist?.id || null;
}

/**
 * 휴지통 Gist ID를 localStorage에 저장합니다.
 */
export function saveTrashGistId(gistId: string): void {
  localStorage.setItem('trash_gist_id', gistId);
}

/**
 * localStorage에서 휴지통 Gist ID를 가져옵니다.
 */
export function getTrashGistId(): string | null {
  return localStorage.getItem('trash_gist_id');
}

