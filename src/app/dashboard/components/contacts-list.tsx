'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Search, MessageSquare, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import type { User, ContactRequest } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCachedContacts, saveContactsToCache } from '@/lib/storage/lists-cache';
import { ContactSkeleton } from '@/components/ui/contact-skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function ContactsList() {
  const [contacts, setContacts] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchContacts();
    fetchSentRequests();
  }, []);

  const fetchContacts = async () => {
    // Try to load from cache first
    const cachedContacts = getCachedContacts();
    if (cachedContacts && cachedContacts.length >= 0) {
      setContacts(cachedContacts);
      setIsLoading(false);
    }

    // Fetch from server (update cache in background)
    try {
      const response = await fetch('/api/contacts/list');
      if (response.ok) {
        const data = await response.json();
        const contacts = data.contacts || [];
        setContacts(contacts);
        saveContactsToCache(contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const response = await fetch('/api/contact-requests/sent');
      if (response.ok) {
        const data = await response.json();
        const requestsWithDates = (data.requests || []).map((req: any) => ({
          ...req,
          createdAt: new Date(req.createdAt),
          updatedAt: new Date(req.updatedAt),
        }));
        setSentRequests(requestsWithDates);
      }
    } catch (error) {
      console.error('Error fetching sent requests:', error);
    }
  };

  const getRequestStatus = (userId: string): 'contact' | 'pending' | 'none' => {
    if (contacts.some((c) => c.id === userId)) {
      return 'contact';
    }
    if (sentRequests.some((r) => r.requestedId === userId && r.status === 'pending')) {
      return 'pending';
    }
    return 'none';
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/contact-requests/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
        toast({
          title: 'Solicitação cancelada',
          description: 'A solicitação foi cancelada com sucesso.',
        });
      } else {
        const data = await response.json();
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível cancelar a solicitação',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    }
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // If query is too short, clear results
    if (!value || value.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Set loading state
    setIsSearching(true);

    // Debounce search
    const timeout = setTimeout(() => {
      performSearch(value);
    }, 500);

    setSearchTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleAddContact = async (contactId: string) => {
    try {
      const response = await fetch('/api/contacts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId }),
      });

      if (response.ok) {
        toast({
          title: 'Solicitação enviada!',
          description: 'A solicitação de amizade foi enviada. Aguarde a resposta.',
        });
        // Refetch sent requests to update UI
        fetchSentRequests();
        // Remove from search results
        setSearchResults((prev) => prev.filter((u) => u.id !== contactId));
      } else {
        const data = await response.json();
        toast({
          title: 'Erro ao adicionar',
          description: data.error || 'Não foi possível adicionar o contato',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao adicionar',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    }
  };

  // Reset search when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
    }
  }, [isDialogOpen]);

  const [contactSearch, setContactSearch] = useState('');

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (contact.nickname && contact.nickname.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <ContactSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
              <UserPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Adicionar Contato</span>
              <span className="sm:hidden">Adicionar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Adicionar Contato</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Digite o nome ou nickname do usuário que deseja adicionar aos seus contatos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou nickname..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="text-sm sm:text-base pl-9"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <p className="text-xs sm:text-sm text-center text-muted-foreground py-4">
                    Digite pelo menos 2 caracteres para buscar
                  </p>
                )}

                {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
                  <p className="text-xs sm:text-sm text-center text-muted-foreground py-4">
                    Nenhum usuário encontrado
                  </p>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((user) => {
                      const status = getRequestStatus(user.id);
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 sm:p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/10 gap-2 sm:gap-3 shadow-md"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <Link href={`/profile/${user.id}`} className="hover:opacity-80 transition-opacity shrink-0">
                              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 cursor-pointer">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback className="text-xs sm:text-sm">{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <Link
                                href={`/profile/${user.id}`}
                                className="font-medium truncate text-sm sm:text-base hover:underline block"
                                title={user.name}
                              >
                                {user.name}
                              </Link>
                              {user.nickname && (
                                <p className="text-xs sm:text-sm text-muted-foreground truncate" title={`@${user.nickname}`}>
                                  @{user.nickname}
                                </p>
                              )}
                            </div>
                          </div>
                          {status === 'contact' ? (
                            <Button
                              size="sm"
                              disabled
                              variant="outline"
                              className="shrink-0 text-xs px-2 sm:px-3"
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              <span className="hidden sm:inline">Contato</span>
                            </Button>
                          ) : status === 'pending' ? (
                            (() => {
                              const request = sentRequests.find((r) => r.requestedId === user.id);
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => request && handleCancelRequest(request.id)}
                                  className="shrink-0 text-xs px-2 sm:px-3"
                                >
                                  <Clock className="mr-1 h-3 w-3" />
                                  <span className="hidden sm:inline">Pendente</span>
                                </Button>
                              );
                            })()
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAddContact(user.id)}
                              className="shrink-0 text-xs px-2 sm:px-3"
                            >
                              <UserPlus className="mr-1 h-3 w-3" />
                              <span className="hidden sm:inline">Adicionar</span>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {searchQuery.trim().length === 0 && (
                  <p className="text-xs sm:text-sm text-center text-muted-foreground py-4">
                    Digite o nome ou nickname para buscar usuários
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {contacts.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar meus contatos..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        )}
      </div>

      {contacts.length === 0 && !isLoading ? (
        <EmptyState
          icon={<UserPlus className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />}
          title="Nenhum contato ainda"
          description="Adicione contatos para começar a conversar e compartilhar momentos com sua família."
          action={{
            label: 'Adicionar contato',
            onClick: () => setIsDialogOpen(true),
          }}
        />
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Search className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Nenhum contato encontrado para "{contactSearch}"</p>
        </div>
      ) : (
        <div className="space-y-2 h-full overflow-y-auto">
          {filteredContacts.map((contact, index) => {
            const rainbowColors = [
              'border-[#3B82F6]',
              'border-[#EC4899]',
              'border-[#10B981]',
              'border-[#F59E0B]',
              'border-[#8B5CF6]',
              'border-[#EF4444]',
            ];
            const borderColor = rainbowColors[index % rainbowColors.length];

            return (
              <div
                key={contact.id}
                className={cn(
                  "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5",
                  borderColor,
                  "bg-gradient-to-r from-background via-secondary/5 to-primary/5 hover:from-secondary/10"
                )}
              >
                <Link href={`/profile/${contact.id}`} className="hover:opacity-80 transition-opacity shrink-0">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 cursor-pointer">
                    <AvatarImage src={contact.avatarUrl} />
                    <AvatarFallback className="text-xs sm:text-sm">{getInitials(contact.name)}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <Link
                    href={`/profile/${contact.id}`}
                    className="font-medium truncate text-xs sm:text-sm md:text-base hover:underline block"
                    title={contact.name}
                  >
                    {contact.name}
                  </Link>
                  {contact.nickname && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title={`@${contact.nickname}`}>
                      @{contact.nickname}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 p-0"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/direct-conversations/create', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ otherUserId: contact.id }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        router.push(`/chat/${data.conversationId}`);
                      } else {
                        const data = await response.json();
                        toast({
                          title: 'Erro ao iniciar conversa',
                          description: data.error || 'Não foi possível iniciar a conversa',
                          variant: 'destructive',

                        });
                      }
                    } catch (error) {
                      toast({
                        title: 'Erro ao iniciar conversa',
                        description: 'Ocorreu um erro inesperado',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

