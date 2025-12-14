'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Hash, AtSign, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getSearchHistory, 
  addToSearchHistory, 
  clearSearchHistory, 
  removeFromSearchHistory,
  extractHashtags,
  extractMentions,
  type SearchHistoryItem 
} from '@/lib/storage/search-history';

interface FeedSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function FeedSearch({ value, onChange, onSearch, placeholder = 'Buscar posts...' }: FeedSearchProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    if (query.trim().length === 0) return;
    
    // Detect type
    const hashtags = extractHashtags(query);
    const mentions = extractMentions(query);
    const type = hashtags.length > 0 ? 'hashtag' : mentions.length > 0 ? 'mention' : 'text';
    
    // Add to history
    addToSearchHistory(query, type);
    setHistory(getSearchHistory());
    
    // Trigger search
    onSearch(query);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(value);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    onChange(item.query);
    handleSearch(item.query);
  };

  const handleRemoveHistory = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeFromSearchHistory(query);
    setHistory(getSearchHistory());
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const filteredHistory = history.filter((item) => 
    item.query.toLowerCase().includes(value.toLowerCase())
  );

  const hashtags = extractHashtags(value);
  const mentions = extractMentions(value);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9 text-xs sm:text-sm"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 touch-manipulation"
            onClick={handleClear}
            aria-label="Limpar busca"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && (value.length > 0 || history.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Current query indicators */}
          {value.length > 0 && (
            <div className="p-2 border-b space-y-1">
              {hashtags.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                  <Hash className="h-3.5 w-3.5" />
                  <span>Hashtags: {hashtags.join(', ')}</span>
                </div>
              )}
              {mentions.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                  <AtSign className="h-3.5 w-3.5" />
                  <span>Menções: {mentions.join(', ')}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearch(value)}
                className="w-full justify-start text-xs sm:text-sm h-8"
              >
                <Search className="h-3.5 w-3.5 mr-2" />
                Buscar "{value}"
              </Button>
            </div>
          )}

          {/* History */}
          {filteredHistory.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Histórico
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="h-6 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
              <div className="space-y-1">
                {filteredHistory.map((item, index) => (
                  <button
                    key={`${item.query}-${item.timestamp}`}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full px-2 py-1.5 text-left hover:bg-muted rounded text-xs sm:text-sm flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {item.type === 'hashtag' ? (
                        <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : item.type === 'mention' ? (
                        <AtSign className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : (
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate">{item.query}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleRemoveHistory(e, item.query)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {value.length > 0 && filteredHistory.length === 0 && history.length > 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Nenhum resultado no histórico
            </div>
          )}
        </div>
      )}
    </div>
  );
}

