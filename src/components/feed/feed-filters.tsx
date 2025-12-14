'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, X, Filter, Calendar, Image as ImageIcon, Video, Heart, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User as UserType } from '@/lib/data';
import { FeedSearch } from './feed-search';

interface FeedFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'recent' | 'likes' | 'comments';
  onSortChange: (sort: 'recent' | 'likes' | 'comments') => void;
  filterByUser?: string;
  onFilterByUserChange?: (userId: string | undefined) => void;
  filterByDate?: 'today' | 'week' | 'month' | 'year' | 'all';
  onFilterByDateChange?: (date: 'today' | 'week' | 'month' | 'year' | 'all') => void;
  filterByMediaType?: 'image' | 'video' | 'all';
  onFilterByMediaTypeChange?: (type: 'image' | 'video' | 'all') => void;
  filterByLiked?: boolean;
  onFilterByLikedChange?: (liked: boolean) => void;
  filterBySaved?: boolean;
  onFilterBySavedChange?: (saved: boolean) => void;
}

export function FeedFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterByUser,
  onFilterByUserChange,
  filterByDate = 'all',
  onFilterByDateChange,
  filterByMediaType = 'all',
  onFilterByMediaTypeChange,
  filterByLiked = false,
  onFilterByLikedChange,
  filterBySaved = false,
  onFilterBySavedChange,
}: FeedFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserType[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Buscar usuários para autocomplete
  useEffect(() => {
    if (userSearchQuery.trim().length > 0) {
      const timeoutId = setTimeout(async () => {
        try {
          const response = await fetch(`/api/users/search?q=${encodeURIComponent(userSearchQuery.trim())}`);
          if (response.ok) {
            const data = await response.json();
            setUserSearchResults(data.users || []);
            setShowUserSearch(true);
          }
        } catch (error) {
          console.error('Error searching users:', error);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setUserSearchResults([]);
      setShowUserSearch(false);
    }
  }, [userSearchQuery]);

  const hasActiveFilters = 
    filterByDate !== 'all' ||
    filterByMediaType !== 'all' ||
    filterByLiked ||
    filterBySaved ||
    filterByUser;

  const clearAllFilters = () => {
    onFilterByDateChange?.('all');
    onFilterByMediaTypeChange?.('all');
    onFilterByLikedChange?.(false);
    onFilterBySavedChange?.(false);
    onFilterByUserChange?.(undefined);
    setUserSearchQuery('');
    setShowUserSearch(false);
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Search Bar */}
      <FeedSearch
        value={searchQuery}
        onChange={onSearchChange}
        onSearch={onSearchChange}
        placeholder="Buscar posts, #hashtags, @menções..."
      />

      {/* Filters Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 touch-manipulation"
        >
          <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Filtros</span>
          <span className="sm:hidden">Filtros</span>
          {hasActiveFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs sm:text-sm h-8 sm:h-9 touch-manipulation"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-2 sm:p-3 border rounded-lg bg-muted/50 space-y-2 sm:space-y-3 animate-slide-in">
          {/* Sort */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Ordenar por:
            </label>
            <Select value={sortBy} onValueChange={(value: any) => onSortChange(value)}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="likes">Mais curtidos</SelectItem>
                <SelectItem value="comments">Mais comentados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          {onFilterByDateChange && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Período:
              </label>
              <Select value={filterByDate} onValueChange={(value: any) => onFilterByDateChange(value)}>
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Media Type Filter */}
          {onFilterByMediaTypeChange && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Tipo de mídia:
              </label>
              <Select value={filterByMediaType} onValueChange={(value: any) => onFilterByMediaTypeChange(value)}>
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="image">Apenas imagens</SelectItem>
                  <SelectItem value="video">Apenas vídeos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* User Filter */}
          {onFilterByUserChange && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Usuário:
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Buscar usuário..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
                {filterByUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => {
                      onFilterByUserChange(undefined);
                      setUserSearchQuery('');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                {showUserSearch && userSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onFilterByUserChange(user.id);
                          setUserSearchQuery(user.name);
                          setShowUserSearch(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted text-xs sm:text-sm flex items-center gap-2"
                      >
                        <span className="truncate">{user.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Checkboxes */}
          <div className="space-y-2 sm:space-y-2.5 pt-1 border-t">
            {onFilterByLikedChange && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-liked"
                  checked={filterByLiked}
                  onCheckedChange={(checked) => onFilterByLikedChange(checked === true)}
                  className="h-4 w-4"
                />
                <Label
                  htmlFor="filter-liked"
                  className="text-xs sm:text-sm font-normal flex items-center gap-1.5 cursor-pointer"
                >
                  <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Apenas curtidos
                </Label>
              </div>
            )}

            {onFilterBySavedChange && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-saved"
                  checked={filterBySaved}
                  onCheckedChange={(checked) => onFilterBySavedChange(checked === true)}
                  className="h-4 w-4"
                />
                <Label
                  htmlFor="filter-saved"
                  className="text-xs sm:text-sm font-normal flex items-center gap-1.5 cursor-pointer"
                >
                  <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Apenas salvos
                </Label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

