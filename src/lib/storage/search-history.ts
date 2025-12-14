/**
 * Gerenciar histórico de buscas
 */

const SEARCH_HISTORY_KEY = 'feed_search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  type: 'text' | 'hashtag' | 'mention';
}

/**
 * Adicionar busca ao histórico
 */
export function addToSearchHistory(query: string, type: 'text' | 'hashtag' | 'mention' = 'text'): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getSearchHistory();
    
    // Remover duplicatas
    const filteredHistory = history.filter((item) => item.query !== query);
    
    // Adicionar no início
    const newItem: SearchHistoryItem = {
      query,
      timestamp: Date.now(),
      type,
    };
    
    const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving search history:', error);
  }
}

/**
 * Obter histórico de buscas
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const historyJson = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!historyJson) return [];
    
    const history = JSON.parse(historyJson) as SearchHistoryItem[];
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error reading search history:', error);
    return [];
  }
}

/**
 * Limpar histórico de buscas
 */
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
}

/**
 * Remover item específico do histórico
 */
export function removeFromSearchHistory(query: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getSearchHistory();
    const filteredHistory = history.filter((item) => item.query !== query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error('Error removing from search history:', error);
  }
}

/**
 * Extrair hashtags de uma string
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((m) => m.substring(1)) : [];
}

/**
 * Extrair menções de uma string
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map((m) => m.substring(1)) : [];
}

