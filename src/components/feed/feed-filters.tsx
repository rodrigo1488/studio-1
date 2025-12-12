'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'recent' | 'likes' | 'comments';
  onSortChange: (sort: 'recent' | 'likes' | 'comments') => void;
  filterByUser?: string;
  onFilterByUserChange?: (userId: string | undefined) => void;
}

export function FeedFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterByUser,
  onFilterByUserChange,
}: FeedFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar posts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filters Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
        </Button>

        {filterByUser && onFilterByUserChange && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterByUserChange(undefined)}
            className="text-xs"
          >
            Limpar filtro de usuário
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-3 border rounded-lg bg-muted/50 space-y-3 animate-slide-in">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ordenar por:</label>
            <Select value={sortBy} onValueChange={(value: any) => onSortChange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="likes">Mais curtidos</SelectItem>
                <SelectItem value="comments">Mais comentados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

