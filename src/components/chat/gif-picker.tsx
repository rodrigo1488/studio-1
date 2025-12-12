'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Gif {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
      width: string;
      height: string;
    };
  };
}

interface GifPickerProps {
  onSelectGif: (gifUrl: string) => void;
  onClose?: () => void;
}

const GIPHY_API_KEY = 'dc6zaTOxFJmzC'; // Public beta key (rate limited)
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

export function GifPicker({ onSelectGif, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load trending GIFs on mount
  useEffect(() => {
    fetchTrendingGifs();
  }, []);

  // Search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      setIsLoading(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchGifs(searchQuery.trim());
      }, 500);
    } else {
      fetchTrendingGifs();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const fetchTrendingGifs = async () => {
    try {
      setIsLoadingTrending(true);
      const response = await fetch(`${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=24`);
      const data = await response.json();
      if (data.data) {
        setGifs(data.data);
      }
    } catch (error) {
      console.error('Error fetching trending GIFs:', error);
    } finally {
      setIsLoadingTrending(false);
      setIsLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24`
      );
      const data = await response.json();
      if (data.data) {
        setGifs(data.data);
      }
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGif = (gif: Gif) => {
    // Use original URL for better quality
    onSelectGif(gif.images.original.url);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="w-full h-[400px] flex flex-col border rounded-lg bg-background">
      {/* Search Bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* GIF Grid */}
      <ScrollArea className="flex-1">
        {isLoadingTrending || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Nenhum GIF encontrado' : 'Carregando GIFs...'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleSelectGif(gif)}
                className="relative aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity border border-border"
              >
                <Image
                  src={gif.images.fixed_height.url}
                  alt={gif.title || 'GIF'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

