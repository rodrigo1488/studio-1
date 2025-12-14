'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, UserPlus, Search, Loader2 } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { User } from '@/lib/data';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MentionSelectorProps {
  selectedUsers: User[];
  onUsersChange: (users: User[]) => void;
  currentUserId: string;
}

export function MentionSelector({ selectedUsers, onUsersChange, currentUserId }: MentionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        // Filter out already selected users and current user
        const filtered = (data.users || []).filter(
          (user: User) => 
            !selectedUsers.some((su) => su.id === user.id) && 
            user.id !== currentUserId
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value || value.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      performSearch(value);
    }, 300);

    searchTimeoutRef.current = timeout;
  };

  const handleAddUser = (user: User) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      onUsersChange([...selectedUsers, user]);
      setSearchQuery('');
      setSearchResults([]);
      // Keep popover open after adding user
      setIsOpen(true);
    }
  };

  const handleRemoveUser = (userId: string) => {
    onUsersChange(selectedUsers.filter((u) => u.id !== userId));
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use a longer timeout to ensure the popover is fully rendered
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Force focus and selection
          inputRef.current.setSelectionRange(0, 0);
          // Dispatch a focus event to ensure it's registered
          inputRef.current.dispatchEvent(new Event('focus', { bubbles: true }));
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-left font-normal"
            onClick={() => setIsOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span className="text-xs sm:text-sm">
              {selectedUsers.length > 0
                ? `${selectedUsers.length} pessoa${selectedUsers.length !== 1 ? 's' : ''} marcada${selectedUsers.length !== 1 ? 's' : ''}`
                : 'Marcar pessoas'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] sm:w-[400px] p-0 mention-selector-content" 
          align="start"
          side="bottom"
          sideOffset={4}
          style={{ zIndex: 9999 }}
          onOpenAutoFocus={(e) => {
            // Prevent default auto focus, we'll handle it manually
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            // Prevent closing when clicking anywhere inside the dialog
            const target = e.target as HTMLElement;
            const dialog = target.closest('[role="dialog"]');
            const isDialogOverlay = target.hasAttribute('data-radix-dialog-overlay');
            
            // Always prevent closing if clicking inside the dialog content
            if (dialog && !isDialogOverlay) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking inside dialog
            const target = e.target as HTMLElement;
            const dialog = target.closest('[role="dialog"]');
            if (dialog) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            // Prevent closing when focusing inside dialog
            const target = e.target as HTMLElement;
            const dialog = target.closest('[role="dialog"]');
            if (dialog) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Allow closing with Escape
            setIsOpen(false);
          }}
        >
          <div className="p-3 border-b" style={{ pointerEvents: 'auto' }}>
            <div className="relative" style={{ pointerEvents: 'auto' }}>
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Buscar pessoas..."
                value={searchQuery}
                onChange={(e) => {
                  e.stopPropagation();
                  handleSearchChange(e.target.value);
                }}
                onInput={(e) => {
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                onKeyUp={(e) => {
                  e.stopPropagation();
                }}
                onKeyPress={(e) => {
                  e.stopPropagation();
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                  setIsOpen(true);
                }}
                onBlur={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className="pl-8 text-sm relative z-20"
                style={{ pointerEvents: 'auto', position: 'relative' }}
                tabIndex={0}
              />
              {isSearching && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
              )}
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="p-2 space-y-1">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddUser(user);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      {user.nickname && (
                        <p className="text-xs text-muted-foreground truncate">@{user.nickname}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim().length < 2 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Digite pelo menos 2 caracteres para buscar
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full border border-primary/20"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="text-[10px]">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{user.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full hover:bg-primary/20"
                onClick={() => handleRemoveUser(user.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

