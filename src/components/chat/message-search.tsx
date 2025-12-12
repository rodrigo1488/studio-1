'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Message, User } from '@/lib/data';

interface MessageSearchProps {
  roomId: string;
  onMessageSelect?: (message: Message) => void;
}

export function MessageSearch({ roomId, onMessageSelect }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Message & { user?: User })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, roomId]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/messages/search?roomId=${roomId}&q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.messages || []);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      onMessageSelect?.(results[selectedIndex]);
      setQuery('');
      setResults([]);
    }
  };

  const highlightText = (text: string, query: string) => {
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar mensagens..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {query && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-64">
          <ScrollArea className="max-h-64">
            <div className="p-2">
              {results.map((message, index) => (
                <button
                  key={message.id}
                  className={cn(
                    'w-full text-left p-2 rounded hover:bg-muted transition-colors',
                    index === selectedIndex && 'bg-muted'
                  )}
                  onClick={() => {
                    onMessageSelect?.(message);
                    setQuery('');
                    setResults([]);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {message.user?.name || 'Usuário'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.timestamp), 'p', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm truncate">
                        {message.text ? highlightText(message.text, query) : 'Mídia'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {query && isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          Buscando...
        </div>
      )}

      {query && !isSearching && results.length === 0 && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          Nenhuma mensagem encontrada
        </div>
      )}
    </div>
  );
}

