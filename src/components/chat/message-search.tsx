'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, MessageSquare, Filter, Image as ImageIcon, Link as LinkIcon, Calendar } from 'lucide-react';
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'media' | 'link'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<(Message & { user?: User })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    // Allow search with filters even without query
    const hasQuery = query.trim().length >= 2;
    const hasFilters = typeFilter !== 'all' || dateFrom || dateTo;
    
    if (!hasQuery && !hasFilters) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, typeFilter, dateFrom, dateTo, roomId]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        roomId,
      });
      
      if (query.trim().length > 0) {
        params.append('q', query.trim());
      }
      
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      
      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      const response = await fetch(`/api/messages/search?${params.toString()}`);
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

  const hasActiveFilters = typeFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="relative space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar mensagens..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-9 text-xs sm:text-sm"
          />
          {(query || hasActiveFilters) && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => {
                setQuery('');
                setTypeFilter('all');
                setDateFrom('');
                setDateTo('');
                setResults([]);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
        >
          <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-2 sm:p-3 border rounded-lg bg-muted/50 space-y-2 sm:space-y-3 animate-slide-in">
          {/* Type Filter */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Tipo:
            </label>
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="text">Apenas texto</SelectItem>
                <SelectItem value="media">Apenas mídia</SelectItem>
                <SelectItem value="link">Apenas links</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filters */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Data:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">De:</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Até:</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

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

      {((query && query.length >= 2) || hasActiveFilters) && !isSearching && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          Nenhuma mensagem encontrada
        </div>
      )}
    </div>
  );
}

