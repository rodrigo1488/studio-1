'use client';

import {
  ArrowLeft,
  Paperclip,
  Send,
  Phone,
  Image as ImageIcon,
  Mic,
  Video,
  QrCode,
  Camera,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  RotateCcw,
  Info,
  Smile,
  Forward,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Room, Message, User } from '@/lib/data';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { subscribeToMessages, unsubscribeFromChannel, convertMessageToAppFormat } from '@/lib/supabase/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { getMediaTypeFromFile } from '@/lib/supabase/storage';
import { RoomCodeDisplay } from '@/components/room-code-display';
import { RoomDetails } from '@/components/room-details';
import { CallButton } from '@/components/webrtc/call-button';
import { CameraCapture } from '@/components/media/camera-capture';
import { AudioPlayer } from '@/components/media/audio-player';
import { addMessageToCache, saveMessagesToCache } from '@/lib/storage/messages-cache';
import { markNotificationsAsRead } from '@/lib/storage/notifications';
import { getCachedUser, saveUserToCache } from '@/lib/storage/room-cache';
import { MessageReactions } from '@/components/chat/message-reactions';
import { MessageReply } from '@/components/chat/message-reply';
import { ForwardMessageDialog } from '@/components/chat/forward-message-dialog';
import { EditMessageDialog } from '@/components/chat/edit-message-dialog';
import { MessageEditIndicator } from '@/components/chat/message-edit-indicator';
import { TemporaryMessageIndicator } from '@/components/chat/temporary-message-indicator';
import { MessageThread } from '@/components/chat/message-thread';
import { MessageSearch } from '@/components/chat/message-search';
import { GifPicker } from '@/components/chat/gif-picker';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ForwardedMessageBadge } from '@/components/chat/forwarded-message-badge';

interface ChatLayoutProps {
  room: Room;
  messages: (Message & { user?: User })[];
  currentUser: User;
}

const getInitials = (name: string = '') => {
  const names = name.split(' ');
  const initials = names.map((n) => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
};

const formatDate = (date: Date) => {
  if (isToday(date)) {
    return `Hoje ${format(date, 'p', { locale: ptBR })}`;
  }
  if (isYesterday(date)) {
    return `Ontem ${format(date, 'p', { locale: ptBR })}`;
  }
  return format(date, 'P p', { locale: ptBR });
};

// Helper function to ensure timestamp is a Date object
const ensureDate = (timestamp: Date | string | number): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  return new Date();
};

// Helper function to sort messages by timestamp
const sortMessagesByTimestamp = (messages: (Message & { user?: User })[]): (Message & { user?: User })[] => {
  return messages.sort((a, b) => {
    const dateA = ensureDate(a.timestamp).getTime();
    const dateB = ensureDate(b.timestamp).getTime();
    return dateA - dateB;
  });
};

export default function ChatLayout({
  room,
  messages: initialMessages,
  currentUser,
}: ChatLayoutProps) {
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<(Message & { user?: User })[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [shouldCancelRecording, setShouldCancelRecording] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [replyingTo, setReplyingTo] = useState<(Message & { user?: User }) | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<(Message & { user?: User }) | null>(null);
  const [editingMessage, setEditingMessage] = useState<(Message & { user?: User }) | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Buscar o outro usuário se for conversa direta
  useEffect(() => {
    async function fetchOtherUser() {
      // Verificar se é conversa direta (código começa com "DM-")
      if (!room.code?.startsWith('DM-')) {
        return;
      }

      // Buscar o outro usuário da conversa direta
      try {
        const response = await fetch(`/api/direct-conversations/${room.id}/other-user`);
        if (response.ok) {
          const data = await response.json();
          setOtherUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching other user:', error);
      }
    }

    fetchOtherUser();
  }, [room.id, room.code]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0) {
      // Mark all messages in room as read
      fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
      }).catch(() => {});
    }
  }, [messages.length, room.id]);

  // Scroll to bottom when new messages arrive (only if not loading older messages)
  useEffect(() => {
    if (isLoadingMore) return; // Don't scroll when loading older messages
    
    // Usar requestAnimationFrame para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [messages.length, isLoadingMore]);

  // Scroll to bottom on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Subscribe to realtime messages
  useEffect(() => {
    // Cleanup previous subscription if exists
    if (channelRef.current) {
      unsubscribeFromChannel(channelRef.current).catch(console.error);
    }

    const channel = subscribeToMessages(room.id, async (newMessage) => {
      // VALIDAÇÃO: Ignorar mensagens sem senderId válido
      if (!newMessage.sender_id || newMessage.sender_id.trim() === '') {
        console.warn('Received message without valid senderId:', newMessage);
        return;
      }
      // Check if we already have this user cached
      let user = getCachedUser(newMessage.sender_id);
      
      // Only fetch if not in cache
      if (!user) {
        try {
          const userResponse = await fetch(`/api/users/${newMessage.sender_id}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            user = userData.user;
            // Save to cache
            if (user) {
              saveUserToCache(user);
            }
          }
        } catch (error) {
          console.error('Error fetching user for new message:', error);
        }
      }
      
      // CRÍTICO: O senderId SEMPRE vem do servidor (newMessage.sender_id)
      // NUNCA confiar no estado local ou em mensagens otimistas
      const appMessage = convertMessageToAppFormat(newMessage, user);
      appMessage.status = 'sent'; // Marcar como enviada quando confirmada pelo servidor
      
      // VALIDAÇÃO: Garantir que o senderId da mensagem do servidor é sempre usado
      // Não importa o que está no estado local, o servidor é a fonte da verdade
      const serverSenderId = newMessage.sender_id;
      
      // Check if message already exists or if it's an optimistic update
      setMessages((prev) => {
        const existingIndex = prev.findIndex((m) => m.id === appMessage.id);
        
        // Se a mensagem já existe (veio do servidor), substituir completamente
        // para garantir que o senderId do servidor seja usado
        if (existingIndex !== -1) {
          const updated = [...prev];
          // Substituir completamente pela mensagem do servidor (fonte da verdade)
          updated[existingIndex] = {
            ...appMessage,
            status: 'sent',
            senderId: serverSenderId, // SEMPRE usar o senderId do servidor
          };
          // Ordenar por timestamp após atualização
          return sortMessagesByTimestamp(updated.map(msg => ({
            ...msg,
            timestamp: ensureDate(msg.timestamp)
          })));
        }
        
        // Verificar se é uma mensagem otimista nossa (mesmo texto e remetente)
        // Mas SEMPRE usar o senderId do servidor quando substituir
        const optimisticIndex = prev.findIndex(
          (m) => 
            m.status === 'sending' && 
            m.senderId === currentUser.id &&
            m.text === appMessage.text &&
            Math.abs(m.timestamp.getTime() - appMessage.timestamp.getTime()) < 10000 // Dentro de 10 segundos
        );
        
        if (optimisticIndex !== -1) {
          // Substituir mensagem otimista pela real do servidor
          // IMPORTANTE: Usar o senderId do servidor, não do estado local
          const updated = [...prev];
          updated[optimisticIndex] = {
            ...appMessage,
            status: 'sent',
            senderId: serverSenderId, // SEMPRE usar o senderId do servidor
          };
          // Ordenar por timestamp após substituição
          return sortMessagesByTimestamp(updated.map(msg => ({
            ...msg,
            timestamp: ensureDate(msg.timestamp)
          })));
        }
        
        // Nova mensagem de outro usuário ou do servidor
        // Add to cache (notificações e badges são tratadas pelo NotificationManager)
        addMessageToCache(room.id, appMessage);
        
        // Adicionar mensagem com senderId do servidor e ordenar por timestamp
        const newMessages = [...prev, {
          ...appMessage,
          senderId: serverSenderId, // SEMPRE usar o senderId do servidor
          timestamp: ensureDate(appMessage.timestamp)
        }];
        return sortMessagesByTimestamp(newMessages.map(msg => ({
          ...msg,
          timestamp: ensureDate(msg.timestamp)
        })));
      });
    });

    channelRef.current = channel;

    // Mark notifications as read when component mounts
    markNotificationsAsRead(room.id);

    return () => {
      // Cleanup: Unsubscribe from realtime channel
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current).catch((error) => {
          console.error('Error unsubscribing from channel:', error);
        });
        channelRef.current = null;
      }
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Stop typing indicator on unmount
      fetch(`/api/typing/${room.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: false }),
      }).catch(() => {});
    };
  }, [room.id, currentUser.id]);

  // Update messages when initialMessages change
  useEffect(() => {
    // Remove duplicates, normalize timestamps, and sort by timestamp
    const uniqueMessages = initialMessages
      .filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      )
      .map(msg => ({
        ...msg,
        timestamp: ensureDate(msg.timestamp)
      }));
    
    // Sort by timestamp (ascending - oldest first)
    const sorted = sortMessagesByTimestamp(uniqueMessages);
    
    setMessages(sorted);
    // Check if there are more messages based on initial load (50 messages per page)
    setHasMoreMessages(sorted.length >= 50);
  }, [initialMessages]);

  // Scroll to bottom when new messages arrive (but not when loading older messages)
  useEffect(() => {
    if (scrollAreaRef.current && !isLoadingMore) {
      const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        // Only auto-scroll if we're near the bottom (within 100px)
        const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
        if (isNearBottom) {
          setTimeout(() => {
            viewport.scrollTop = viewport.scrollHeight;
          }, 100);
        }
      }
    }
  }, [messages, isLoadingMore]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      // Get the oldest message timestamp
      const oldestMessage = messages[0];
      // Ensure timestamp is a Date object
      const beforeDate = oldestMessage.timestamp instanceof Date 
        ? oldestMessage.timestamp 
        : new Date(oldestMessage.timestamp);

      // Fetch older messages
      const response = await fetch(
        `/api/messages/room/${room.id}?limit=8&before=${beforeDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.messages.length === 0) {
          setHasMoreMessages(false);
          setIsLoadingMore(false);
          return;
        }

        // Get unique sender IDs for new messages
        const senderIds = [...new Set(data.messages.map((msg: Message) => msg.senderId))];
        
        // Fetch users in batch
        let usersMap: Record<string, User> = {};
        if (senderIds.length > 0) {
          try {
            const usersResponse = await fetch('/api/users/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userIds: senderIds }),
            });
            if (usersResponse.ok) {
              const usersData = await usersResponse.json();
              usersMap = usersData.users.reduce((acc: Record<string, User>, user: User) => {
                acc[user.id] = user;
                return acc;
              }, {});
            }
          } catch (error) {
            console.error('Error fetching users in batch:', error);
          }
        }

        // Map messages with users
        const newMessages = data.messages.map((msg: Message) => ({
          ...msg,
          user: usersMap[msg.senderId],
        }));

        // Preserve scroll position
        const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
        const previousScrollHeight = viewport?.scrollHeight || 0;

        // Prepend new messages (they are older), removing duplicates
        setMessages((prev) => {
          // Remove duplicates from prev first
          const uniquePrev = prev.filter((msg, index, self) => 
            index === self.findIndex(m => m.id === msg.id)
          );
          
          // Merge and remove duplicates
          const merged = [...newMessages, ...uniquePrev];
          const uniqueMerged = merged.filter((msg, index, self) => 
            index === self.findIndex(m => m.id === msg.id)
          );
          
          // Ordenar por timestamp (mais antigas primeiro)
          const normalized = uniqueMerged.map(msg => ({
            ...msg,
            timestamp: ensureDate(msg.timestamp)
          }));
          const sorted = sortMessagesByTimestamp(normalized);
          
          // Update cache with merged messages
          saveMessagesToCache(room.id, sorted);
          
          return sorted;
        });
        setHasMoreMessages(data.hasMore);

        // Restore scroll position after DOM update
        setTimeout(() => {
          if (viewport) {
            const newScrollHeight = viewport.scrollHeight;
            viewport.scrollTop = newScrollHeight - previousScrollHeight;
          }
        }, 50);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [messages, room.id, isLoadingMore, hasMoreMessages]);

  // Setup scroll listener for infinite scroll
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (!viewport) return;

    const handleScroll = () => {
      // Load more when scrolled to top (within 200px)
      if (viewport.scrollTop < 200 && hasMoreMessages && !isLoadingMore) {
        loadMoreMessages();
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!messageText.trim() || isSending) return;

    // VALIDAÇÃO CRÍTICA: Verificar se currentUser é válido e está sincronizado com o servidor
    if (!currentUser || !currentUser.id) {
      toast({
        title: 'Erro de autenticação',
        description: 'Sua sessão expirou. Por favor, faça login novamente.',
        variant: 'destructive',
      });
      // Limpar cache e redirecionar
      const { clearAllCache } = await import('@/lib/storage/clear-all-cache');
      clearAllCache();
      window.location.href = '/login';
      return;
    }

    // VALIDAÇÃO: Verificar com o servidor se o usuário ainda está autenticado
    try {
      const authCheck = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      
      if (!authCheck.ok) {
        toast({
          title: 'Sessão expirada',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        const { clearAllCache } = await import('@/lib/storage/clear-all-cache');
        clearAllCache();
        window.location.href = '/login';
        return;
      }

      const authData = await authCheck.json();
      if (!authData.user || authData.user.id !== currentUser.id) {
        console.error('[Send Message] User mismatch detected', {
          cachedUserId: currentUser.id,
          serverUserId: authData.user?.id,
        });
        toast({
          title: 'Erro de segurança',
          description: 'Detectada inconsistência na sessão. Redirecionando...',
          variant: 'destructive',
        });
        const { clearAllCache } = await import('@/lib/storage/clear-all-cache');
        clearAllCache();
        window.location.href = '/login';
        return;
      }
    } catch (error) {
      console.error('[Send Message] Error validating session:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível validar sua sessão. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    // Stop typing indicator when sending message
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    fetch(`/api/typing/${room.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping: false }),
    }).catch(() => {});

    const text = messageText.trim();
    
    // Validate replyTo - skip if it's a temporary message
    let validReplyTo = replyingTo;
    if (replyingTo && replyingTo.id.startsWith('temp-')) {
      toast({
        title: 'Aguarde',
        description: 'Aguarde a mensagem original ser enviada para responder',
        variant: 'default',
      });
      setReplyingTo(null);
      validReplyTo = null;
    }
    
    // Criar mensagem otimista ANTES de qualquer coisa
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message & { user?: User } = {
      id: tempId,
      roomId: room.id,
      senderId: currentUser.id,
      text,
      timestamp: new Date(),
      status: 'sending',
      user: currentUser,
      replyToId: validReplyTo?.id && !validReplyTo.id.startsWith('temp-') ? validReplyTo.id : undefined,
      replyTo: validReplyTo && !validReplyTo.id.startsWith('temp-') ? validReplyTo : undefined,
    };

    // 1. Limpar input IMEDIATAMENTE para feedback visual instantâneo
    setMessageText('');
    setReplyingTo(null);
    
    // 2. Adicionar mensagem ao estado IMEDIATAMENTE (antes de qualquer requisição)
    setMessages((prev) => {
      const newMessages = [...prev, {
        ...optimisticMessage,
        timestamp: ensureDate(optimisticMessage.timestamp)
      }];
      return sortMessagesByTimestamp(newMessages.map(msg => ({
        ...msg,
        timestamp: ensureDate(msg.timestamp)
      })));
    });
    
    // 3. Fazer scroll para a nova mensagem imediatamente
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // 4. Marcar como enviando (mas a mensagem já está visível)
    setIsSending(true);

    // 5. Enviar para o servidor em segundo plano (não bloqueia a UI)
    // Usar setTimeout para garantir que a UI seja atualizada primeiro
    setTimeout(async () => {
      try {
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: room.id,
            text,
            replyToId: validReplyTo?.id && !validReplyTo.id.startsWith('temp-') ? validReplyTo.id : undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          
          // Atualizar status da mensagem otimista para erro
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, status: 'error' as const }
                : msg
            );
            const normalized = updated.map(msg => ({
              ...msg,
              timestamp: ensureDate(msg.timestamp)
            }));
            return sortMessagesByTimestamp(normalized);
          });

          toast({
            title: 'Erro ao enviar mensagem',
            description: data.error || 'Tente novamente',
            variant: 'destructive',
          });
          setMessageText(text); // Restore message text
        } else {
          // Mensagem enviada com sucesso
          const data = await response.json();
          if (data.message?.id && data.message?.senderId) {
            // IMPORTANTE: Usar o senderId do servidor (data.message.senderId)
            // Substituir a mensagem otimista pela real do servidor
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === tempId
                  ? { 
                      ...msg, 
                      id: data.message.id,
                      senderId: data.message.senderId, // SEMPRE usar o senderId do servidor
                      status: 'sent' as const,
                      timestamp: ensureDate(data.message.timestamp || msg.timestamp),
                      replyToId: data.message.replyToId || msg.replyToId,
                      replyTo: data.message.replyTo ? {
                        ...data.message.replyTo,
                        timestamp: ensureDate(data.message.replyTo.timestamp),
                      } : msg.replyTo,
                    }
                  : msg
              );
              const normalized = updated.map(msg => ({
                ...msg,
                timestamp: ensureDate(msg.timestamp),
                replyTo: msg.replyTo ? {
                  ...msg.replyTo,
                  timestamp: ensureDate(msg.replyTo.timestamp),
                } : undefined,
              }));
              return sortMessagesByTimestamp(normalized);
            });
            
            // Adicionar ao cache após sucesso
            addMessageToCache(room.id, {
              ...data.message,
              timestamp: ensureDate(data.message.timestamp),
              replyTo: data.message.replyTo ? {
                ...data.message.replyTo,
                timestamp: ensureDate(data.message.replyTo.timestamp),
              } : undefined,
              user: currentUser,
            });
          }
        }
      } catch (error) {
        // Atualizar status da mensagem otimista para erro
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          );
          return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });

        toast({
          title: 'Erro ao enviar mensagem',
          description: 'Ocorreu um erro inesperado',
          variant: 'destructive',
        });
        setMessageText(text); // Restore message text
      } finally {
        setIsSending(false);
      }
    }, 0); // Delay 0 para executar no próximo tick, garantindo que a UI seja atualizada primeiro
  };

  const handleMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mediaType: 'image' | 'video' | 'audio'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB = 10485760 bytes)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    // Validate file type
    const detectedType = getMediaTypeFromFile(file);
    if (!detectedType || detectedType !== mediaType) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: `Por favor, selecione um arquivo ${mediaType === 'image' ? 'de imagem' : mediaType === 'video' ? 'de vídeo' : 'de áudio'}`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    // Criar mensagem otimista ANTES de qualquer coisa
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const text = mediaType === 'image' ? '📷 Imagem' : mediaType === 'video' ? '🎥 Vídeo' : '🎵 Áudio';
    const optimisticMessage: Message & { user?: User } = {
      id: tempId,
      roomId: room.id,
      senderId: currentUser.id,
      text,
      timestamp: new Date(),
      status: 'sending',
      user: currentUser,
      mediaType,
      // Criar URL temporária para preview
      mediaUrl: URL.createObjectURL(file),
    };

    // 1. Adicionar mensagem ao estado IMEDIATAMENTE (antes de qualquer requisição)
    setMessages((prev) => {
      const newMessages = [...prev, {
        ...optimisticMessage,
        timestamp: ensureDate(optimisticMessage.timestamp)
      }];
      return sortMessagesByTimestamp(newMessages.map(msg => ({
        ...msg,
        timestamp: ensureDate(msg.timestamp)
      })));
    });
    
    // 2. Fazer scroll para a nova mensagem imediatamente
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // 3. Marcar como enviando (mas a mensagem já está visível)
    setIsSending(true);

    // 4. Resetar input imediatamente
    e.target.value = '';

    // 5. Enviar para o servidor em segundo plano
    setTimeout(async () => {
      try {
      // Generate a temporary message ID for the upload path
      const tempMessageId = crypto.randomUUID();

      // Upload media via API route
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', room.id);
      formData.append('messageId', tempMessageId);

      const uploadResponse = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao fazer upload da mídia');
      }

      const uploadData = await uploadResponse.json().catch(() => null);
      if (!uploadData || !uploadData.url) {
        throw new Error('Resposta inválida do servidor');
      }

      const { url } = uploadData;

      // Send message with media
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.id,
          text,
          mediaUrl: url,
          mediaType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Atualizar status da mensagem otimista para erro
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          );
          return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });

        toast({
          title: 'Erro ao enviar mídia',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
      } else {
        const data = await response.json();
        if (data.message?.id) {
          // Atualizar mensagem otimista com ID real e URL do servidor
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, id: data.message.id, mediaUrl: url, status: 'sent' as const }
                : msg
            );
            const normalized = updated.map(msg => ({
              ...msg,
              timestamp: ensureDate(msg.timestamp)
            }));
            return sortMessagesByTimestamp(normalized);
          });
        }
      }
    } catch (error: any) {
      // Atualizar status da mensagem otimista para erro
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, status: 'error' as const }
            : msg
        )
      );

      toast({
        title: 'Erro ao enviar mídia',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
      } finally {
        setIsSending(false);
      }
    }, 0); // Delay 0 para executar no próximo tick
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!gifUrl || isSending) return;

    const tempId = `temp-${Date.now()}`;
    const replyToId = replyingTo?.id;

    // 1. Criar mensagem otimista
    const optimisticMessage: Message & { user?: User } = {
      id: tempId,
      roomId: room.id,
      senderId: currentUser.id,
      text: '🎬 GIF',
      timestamp: new Date(),
      mediaUrl: gifUrl,
      mediaType: 'gif',
      status: 'sending',
      replyToId,
      replyTo: replyingTo || undefined,
      user: currentUser,
    };

    // 2. Adicionar mensagem otimista imediatamente
    setMessages((prev) => {
      const newMessages = [...prev, {
        ...optimisticMessage,
        timestamp: ensureDate(optimisticMessage.timestamp)
      }];
      return sortMessagesByTimestamp(newMessages.map(msg => ({
        ...msg,
        timestamp: ensureDate(msg.timestamp)
      })));
    });
    setReplyingTo(null);

    // 3. Scroll para o final
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // 4. Marcar como enviando
    setIsSending(true);

    // 5. Enviar para o servidor
    setTimeout(async () => {
      try {
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: room.id,
            text: '🎬 GIF',
            mediaUrl: gifUrl,
            mediaType: 'gif',
            replyToId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, status: 'error' as const }
                : msg
            )
          );

          toast({
            title: 'Erro ao enviar GIF',
            description: data.error || 'Tente novamente',
            variant: 'destructive',
          });
        } else {
          const data = await response.json();
          if (data.message?.id && data.message?.senderId) {
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === tempId
                  ? { 
                      ...msg, 
                      id: data.message.id,
                      senderId: data.message.senderId,
                      status: 'sent' as const,
                    }
                  : msg
              );
              const normalized = updated.map(msg => ({
              ...msg,
              timestamp: ensureDate(msg.timestamp)
            }));
            return sortMessagesByTimestamp(normalized);
            });
          }
        }
      } catch (error) {
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          );
          return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });

        toast({
          title: 'Erro ao enviar GIF',
          description: 'Ocorreu um erro ao enviar o GIF.',
          variant: 'destructive',
        });
      } finally {
        setIsSending(false);
      }
    }, 100);
  };

  const handleCameraCapture = async (file: File) => {
    // Criar mensagem otimista ANTES de qualquer coisa
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const text = '📷 Imagem';
    const optimisticMessage: Message & { user?: User } = {
      id: tempId,
      roomId: room.id,
      senderId: currentUser.id,
      text,
      timestamp: new Date(),
      status: 'sending',
      user: currentUser,
      mediaType: 'image',
      mediaUrl: URL.createObjectURL(file),
    };

    // 1. Adicionar mensagem ao estado IMEDIATAMENTE
    setMessages((prev) => {
      const newMessages = [...prev, {
        ...optimisticMessage,
        timestamp: ensureDate(optimisticMessage.timestamp)
      }];
      return sortMessagesByTimestamp(newMessages.map(msg => ({
        ...msg,
        timestamp: ensureDate(msg.timestamp)
      })));
    });
    
    // 2. Fazer scroll para a nova mensagem imediatamente
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // 3. Fechar câmera imediatamente
    setShowCamera(false);

    // 4. Marcar como enviando (mas a mensagem já está visível)
    setIsSending(true);

    // 5. Enviar para o servidor em segundo plano
    setTimeout(async () => {
      try {
      const tempMessageId = crypto.randomUUID();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', room.id);
      formData.append('messageId', tempMessageId);

      const uploadResponse = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao fazer upload da foto');
      }

      const uploadData = await uploadResponse.json().catch(() => null);
      if (!uploadData || !uploadData.url) {
        throw new Error('Resposta inválida do servidor');
      }

      const { url } = uploadData;

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.id,
          text,
          mediaUrl: url,
          mediaType: 'image',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Atualizar status da mensagem otimista para erro
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          );
          return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });

        toast({
          title: 'Erro ao enviar foto',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
      } else {
        const data = await response.json();
        if (data.message?.id) {
          // Atualizar mensagem otimista com ID real e URL do servidor
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, id: data.message.id, mediaUrl: url, status: 'sent' as const }
                : msg
            );
            const normalized = updated.map(msg => ({
              ...msg,
              timestamp: ensureDate(msg.timestamp)
            }));
            return sortMessagesByTimestamp(normalized);
          });
        }
      }
    } catch (error: any) {
      // Atualizar status da mensagem otimista para erro
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, status: 'error' as const }
            : msg
        )
      );

      toast({
        title: 'Erro ao enviar foto',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
      } finally {
        setIsSending(false);
      }
    }, 0); // Delay 0 para executar no próximo tick
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast({
        title: 'Erro ao acessar microfone',
        description: error.message || 'Permissão negada',
        variant: 'destructive',
      });
    }
  };

  const stopAudioRecording = async () => {
    return new Promise<Blob | null>((resolve) => {
      if (!mediaRecorderRef.current || !isRecordingAudio) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setIsRecordingAudio(false);
        setRecordingTime(0);
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  };

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setRecordingTime(0);
  };

  const handleMicPress = async () => {
    await startAudioRecording();
  };

  const handleMicRelease = async () => {
    const currentTime = recordingTime;
    const shouldCancel = shouldCancelRecording;
    setShouldCancelRecording(false);
    
    const audioBlob = await stopAudioRecording();
    
    // Cancel if user dragged away or recording was too short
    if (shouldCancel || !audioBlob || currentTime < 0.5) {
      cancelAudioRecording();
      return;
    }
    
    // Send the audio
    await sendAudioMessage(audioBlob);
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    // Criar mensagem otimista ANTES de qualquer coisa
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const text = '🎵 Áudio';
    const audioUrl = URL.createObjectURL(audioBlob);
    const optimisticMessage: Message & { user?: User } = {
      id: tempId,
      roomId: room.id,
      senderId: currentUser.id,
      text,
      timestamp: new Date(),
      status: 'sending',
      user: currentUser,
      mediaType: 'audio',
      mediaUrl: audioUrl,
    };

    // 1. Adicionar mensagem ao estado IMEDIATAMENTE
    setMessages((prev) => {
      const newMessages = [...prev, {
        ...optimisticMessage,
        timestamp: ensureDate(optimisticMessage.timestamp)
      }];
      return sortMessagesByTimestamp(newMessages.map(msg => ({
        ...msg,
        timestamp: ensureDate(msg.timestamp)
      })));
    });
    
    // 2. Fazer scroll para a nova mensagem imediatamente
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // 3. Marcar como enviando (mas a mensagem já está visível)
    setIsSending(true);

    // 4. Enviar para o servidor em segundo plano
    setTimeout(async () => {
      try {
      // Convert blob to File
      const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      const tempMessageId = crypto.randomUUID();
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('roomId', room.id);
      formData.append('messageId', tempMessageId);

      const uploadResponse = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao fazer upload do áudio');
      }

      const uploadData = await uploadResponse.json().catch(() => null);
      if (!uploadData || !uploadData.url) {
        throw new Error('Resposta inválida do servidor');
      }

      const { url } = uploadData;

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.id,
          text: '',
          mediaUrl: url,
          mediaType: 'audio',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Atualizar status da mensagem otimista para erro
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          );
          return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });

        toast({
          title: 'Erro ao enviar áudio',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
      } else {
        const data = await response.json();
        if (data.message?.id) {
          // Atualizar mensagem otimista com ID real e URL do servidor
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, id: data.message.id, mediaUrl: url, status: 'sent' as const }
                : msg
            );
            const normalized = updated.map(msg => ({
              ...msg,
              timestamp: ensureDate(msg.timestamp)
            }));
            return sortMessagesByTimestamp(normalized);
          });
        }
      }
    } catch (error: any) {
      // Atualizar status da mensagem otimista para erro
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, status: 'error' as const }
            : msg
        )
      );

      toast({
        title: 'Erro ao enviar áudio',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
      } finally {
        setIsSending(false);
      }
    }, 0); // Delay 0 para executar no próximo tick
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAudioRecording();
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing indicator on unmount
      fetch(`/api/typing/${room.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: false }),
      }).catch(() => {});
    };
  }, [room.id]);

  return (
    <div className="flex h-full w-full flex-col relative">
      {/* Chat Header */}
      <header className="flex h-14 sm:h-16 items-center justify-between border-b-2 border-primary/30 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-sm px-1.5 sm:px-2 md:px-4 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
          <Button asChild variant="ghost" size="icon" className="-ml-1 sm:-ml-2 shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {otherUser ? (
              <Link href={`/profile/${otherUser.id}`} className="hover:opacity-80 transition-opacity shrink-0">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 cursor-pointer">
                  <AvatarImage src={otherUser.avatarUrl} />
                  <AvatarFallback className="text-[10px] sm:text-xs">{getInitials(otherUser.name)}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 shrink-0">
                <AvatarImage src={otherUser?.avatarUrl} />
                <AvatarFallback className="text-[10px] sm:text-xs">{getInitials(otherUser?.name || room.name)}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              {otherUser ? (
                <Link 
                  href={`/profile/${otherUser.id}`}
                  className="font-semibold text-xs sm:text-sm md:text-base truncate hover:underline"
                  title={otherUser.name}
                >
                  {otherUser.name}
                </Link>
              ) : (
                <span className="font-semibold text-xs sm:text-sm md:text-base truncate" title={room.name}>
                  {room.name}
                </span>
              )}
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {room.code?.startsWith('DM-') ? 'Conversa direta' : `${room.members.length} membros`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowSearch(!showSearch)}
                  className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation"
                >
                  <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buscar mensagens</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {room.code && !room.code.startsWith('DM-') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <RoomCodeDisplay
                      code={room.code}
                      roomName={room.name}
                      showInModal={true}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation">
                          <QrCode className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                        </Button>
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver código da sala</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {!room.code?.startsWith('DM-') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowRoomDetails(true)}
                    className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 touch-manipulation"
                  >
                    <Info className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Detalhes da sala</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <CallButton room={room} currentUser={currentUser} />
        </div>
      </header>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-2 sm:px-3 md:px-4 py-2 border-b bg-muted/30">
          <MessageSearch
            roomId={room.id}
            onMessageSelect={(message) => {
              // Scroll to message
              const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
              if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight message temporarily
                messageElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                setTimeout(() => {
                  messageElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                }, 2000);
              }
              setShowSearch(false);
            }}
          />
        </div>
      )}

      {/* Message Area */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-1.5 sm:p-2 md:p-4 space-y-1.5 sm:space-y-2 md:space-y-4">
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
              <p className="text-muted-foreground text-xs mt-1">Comece uma conversa enviando uma mensagem</p>
            </div>
          ) : (
            (() => {
              const uniqueMessages = messages
                .filter((msg, index, self) => index === self.findIndex(m => m.id === msg.id))
                .map(msg => ({
                  ...msg,
                  timestamp: ensureDate(msg.timestamp)
                }));
              const sortedMessages = sortMessagesByTimestamp(uniqueMessages);
              
              return sortedMessages.map((message, index) => {
            // Generate rainbow colors for messages
            const rainbowColors = [
              'bg-[#3B82F6]', // Blue
              'bg-[#EC4899]', // Pink
              'bg-[#10B981]', // Green
              'bg-[#F59E0B]', // Amber
              'bg-[#8B5CF6]', // Purple
              'bg-[#EF4444]', // Red
            ];
            const rainbowPastels = [
              'bg-[#BFDBFE]', // Light Blue
              'bg-[#FBCFE8]', // Light Pink
              'bg-[#A7F3D0]', // Light Green
              'bg-[#FDE68A]', // Light Amber
              'bg-[#DDD6FE]', // Light Purple
              'bg-[#FECACA]', // Light Red
            ];
            const ownColor = rainbowColors[index % rainbowColors.length];
            const otherColor = rainbowPastels[index % rainbowPastels.length];
            
            return (
            <div
              key={message.id}
              data-message-id={message.id}
              className={cn(
                'flex items-end gap-2 animate-slide-in-color group',
                message.senderId === currentUser.id ? 'justify-end' : 'justify-start'
              )}
              onContextMenu={(e) => {
                e.preventDefault();
                // Show menu with reply and forward options
                const menu = document.createElement('div');
                menu.className = 'fixed bg-background border rounded-lg shadow-lg p-1 z-50';
                menu.style.left = `${e.clientX}px`;
                menu.style.top = `${e.clientY}px`;
                
                const replyBtn = document.createElement('button');
                replyBtn.className = 'w-full text-left px-3 py-2 hover:bg-muted rounded text-sm';
                replyBtn.textContent = 'Responder';
                replyBtn.onclick = () => {
                  // Skip temporary messages
                  if (!message.id.startsWith('temp-')) {
                    setReplyingTo(message);
                  } else {
                    toast({
                      title: 'Aguarde',
                      description: 'Aguarde a mensagem ser enviada para responder',
                      variant: 'default',
                    });
                  }
                  document.body.removeChild(menu);
                };
                
                const forwardBtn = document.createElement('button');
                forwardBtn.className = 'w-full text-left px-3 py-2 hover:bg-muted rounded text-sm';
                forwardBtn.textContent = 'Encaminhar';
                forwardBtn.onclick = () => {
                  // Skip temporary messages
                  if (!message.id.startsWith('temp-')) {
                    setForwardingMessage(message);
                  } else {
                    toast({
                      title: 'Aguarde',
                      description: 'Aguarde a mensagem ser enviada para encaminhar',
                      variant: 'default',
                    });
                  }
                  document.body.removeChild(menu);
                };
                
                // Add edit button only for own messages that are not temporary
                if (message.senderId === currentUser.id && !message.id.startsWith('temp-') && !message.mediaUrl) {
                  const editBtn = document.createElement('button');
                  editBtn.className = 'w-full text-left px-3 py-2 hover:bg-muted rounded text-sm';
                  editBtn.textContent = 'Editar';
                  editBtn.onclick = () => {
                    setEditingMessage(message);
                    document.body.removeChild(menu);
                  };
                  menu.appendChild(editBtn);
                }
                
                menu.appendChild(replyBtn);
                menu.appendChild(forwardBtn);
                document.body.appendChild(menu);
                
                const removeMenu = () => {
                  if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                  }
                };
                
                setTimeout(() => {
                  document.addEventListener('click', removeMenu, { once: true });
                }, 0);
              }}
            >
              {message.senderId !== currentUser.id && (
                <Link href={`/profile/${message.senderId}`} className="hover:opacity-80 transition-opacity shrink-0">
                  <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 cursor-pointer">
                    <AvatarImage src={message.user?.avatarUrl} />
                    <AvatarFallback className="text-[9px] sm:text-[10px] md:text-xs">{getInitials(message.user?.name)}</AvatarFallback>
                  </Avatar>
                </Link>
              )}
              <div
                className={cn(
                  'max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg rounded-3xl p-2.5 sm:p-3 md:p-4 text-xs sm:text-sm flex flex-col shadow-md',
                  message.senderId === currentUser.id
                    ? `${ownColor} text-white rounded-br-none`
                    : `${otherColor} text-foreground rounded-bl-none border-2 border-primary/20`
                )}
              >
                {message.replyTo && (
                  <MessageReply
                    replyTo={message.replyTo}
                    isOwnMessage={message.senderId === currentUser.id}
                  />
                )}
                {message.text && message.text.startsWith('Encaminhado:') && (
                  <ForwardedMessageBadge
                    isOwnMessage={message.senderId === currentUser.id}
                  />
                )}
                {message.mediaUrl && (
                  <div className={cn(
                    "rounded-lg overflow-hidden",
                    message.mediaType === 'audio' ? '' : 'mb-2'
                  )}>
                    {message.mediaType === 'image' && (
                      <div className="relative w-full max-w-sm">
                        <Image
                          src={message.mediaUrl}
                          alt="Imagem enviada"
                          width={400}
                          height={400}
                          className="rounded-lg object-contain w-full h-auto"
                          style={{ maxHeight: '400px' }}
                          unoptimized
                        />
                      </div>
                    )}
                    {message.mediaType === 'video' && (
                      <video
                        src={message.mediaUrl}
                        controls
                        className="rounded-lg w-full max-h-64"
                        preload="metadata"
                      >
                        Seu navegador não suporta o elemento de vídeo.
                      </video>
                    )}
                    {message.mediaType === 'audio' && (
                      <div className="py-2">
                        <AudioPlayer 
                          src={message.mediaUrl} 
                          isOwnMessage={message.senderId === currentUser.id}
                        />
                      </div>
                    )}
                    {message.mediaType === 'gif' && (
                      <div className="relative w-full max-w-sm">
                        <Image
                          src={message.mediaUrl}
                          alt="GIF"
                          width={400}
                          height={400}
                          className="rounded-lg object-contain w-full h-auto"
                          style={{ maxHeight: '400px' }}
                          unoptimized
                        />
                      </div>
                    )}
                  </div>
                )}
                {message.text && !message.text.match(/^(📷|🎥|🎵|🎬)/) && (
                  <p className={cn(
                    message.text.startsWith('Encaminhado:') && 'text-xs opacity-90 italic'
                  )}>
                    {message.text.startsWith('Encaminhado:') 
                      ? message.text.replace(/^Encaminhado:\s*/, '')
                      : message.text
                    }
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1 self-end flex-wrap justify-end">
                  {message.expiresAt && (
                    <TemporaryMessageIndicator
                      expiresAt={message.expiresAt}
                      className={message.senderId === currentUser.id ? 'text-white/80' : ''}
                    />
                  )}
                  {message.isEdited && (
                    <MessageEditIndicator 
                      className={message.senderId === currentUser.id ? 'text-white/80' : ''}
                    />
                  )}
                  <span className={cn(
                      "text-xs",
                       message.senderId === currentUser.id
                      ? 'text-white/80'
                      : 'text-muted-foreground'
                  )}>
                    {format(message.timestamp, 'p', { locale: ptBR })}
                  </span>
                  {message.senderId === currentUser.id && (
                    <div className="flex items-center">
                      {message.status === 'sending' && (
                        <Loader2 className="h-3 w-3 text-white/60 animate-spin ml-1" />
                      )}
                      {message.status === 'sent' && (
                        <CheckCheck className="h-3 w-3 text-white/80 ml-1" />
                      )}
                      {message.status === 'error' && (
                        <div className="flex items-center gap-1 ml-1">
                          <AlertCircle className="h-3 w-3 text-red-300" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 text-red-300 hover:text-red-200 hover:bg-red-500/20"
                            onClick={async () => {
                              // Retry sending the message
                              const text = message.text;
                              setMessages((prev) => prev.filter((m) => m.id !== message.id));
                              
                              setIsSending(true);
                              try {
                                const response = await fetch('/api/messages/send', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    roomId: room.id,
                                    text,
                                  }),
                                });

                                if (!response.ok) {
                                  const data = await response.json();
                                  toast({
                                    title: 'Erro ao reenviar mensagem',
                                    description: data.error || 'Tente novamente',
                                    variant: 'destructive',
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: 'Erro ao reenviar mensagem',
                                  description: 'Ocorreu um erro inesperado',
                                  variant: 'destructive',
                                });
                              } finally {
                                setIsSending(false);
                              }
                            }}
                            title="Tentar novamente"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className={cn(
                'mt-1',
                message.senderId === currentUser.id ? 'flex justify-end' : 'flex justify-start'
              )}>
                <MessageReactions
                  messageId={message.id}
                  currentUserId={currentUser.id}
                />
              </div>
              {!message.threadId && (
                <MessageThread
                  parentMessage={message}
                  currentUser={currentUser}
                  roomId={room.id}
                />
              )}
            </div>
            );
              });
            })()
          )}
          <div ref={messagesEndRef} />
        </div>
        <TypingIndicator roomId={room.id} currentUserId={currentUser.id} />
      </ScrollArea>

      {/* Input Area - Fixed at bottom */}
      <footer className="fixed bottom-0 left-0 right-0 border-t-2 border-primary/30 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 shadow-md z-20 bg-background">
            {isRecordingAudio && (
          <div className={cn(
            "px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border-b flex items-center justify-between transition-colors",
            shouldCancelRecording 
              ? "bg-destructive/20" 
              : "bg-destructive/10"
          )}>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-destructive animate-pulse shrink-0" />
              <span className="text-xs sm:text-sm font-mono truncate">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <span className={cn(
              "text-[10px] sm:text-xs md:text-sm font-medium truncate ml-2",
              shouldCancelRecording 
                ? "text-destructive" 
                : "text-muted-foreground"
            )}>
              {shouldCancelRecording ? 'Solte para cancelar' : 'Solte para enviar'}
            </span>
          </div>
        )}
        <form
          className="flex w-full items-center gap-1 sm:gap-1.5 md:gap-2 p-1.5 sm:p-2 md:p-4"
          onSubmit={handleSendMessage}
        >
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleMediaUpload(e, 'image')}
            />
            <input
              type="file"
              id="video-upload"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleMediaUpload(e, 'video')}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => setShowCamera(true)}
                    disabled={isSending || isRecordingAudio}
                    className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation"
                  >
                    <Camera className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tirar foto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={isSending || isRecordingAudio}
                    className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation"
                  >
                    <ImageIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enviar imagem</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={micButtonRef}
                    variant="ghost"
                    size="icon"
                    type="button"
                    disabled={isSending}
                    className={cn(
                      "text-muted-foreground hover:text-foreground hover:bg-primary/10 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation",
                      isRecordingAudio && "bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white hover:from-[#DC2626] hover:to-[#B91C1C] shadow-lg animate-pulse"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!isRecordingAudio) {
                        handleMicPress();
                      }
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      if (isRecordingAudio) {
                        handleMicRelease();
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isRecordingAudio) {
                        setShouldCancelRecording(true);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (isRecordingAudio) {
                        setShouldCancelRecording(false);
                      }
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (!isRecordingAudio) {
                        handleMicPress();
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      if (isRecordingAudio) {
                        handleMicRelease();
                      }
                    }}
                    onTouchMove={(e) => {
                      if (isRecordingAudio && micButtonRef.current) {
                        const touch = e.touches[0];
                        const rect = micButtonRef.current.getBoundingClientRect();
                        const isOutside = 
                          touch.clientX < rect.left ||
                          touch.clientX > rect.right ||
                          touch.clientY < rect.top ||
                          touch.clientY > rect.bottom;
                        setShouldCancelRecording(isOutside);
                      }
                    }}
                    onTouchCancel={(e) => {
                      if (isRecordingAudio) {
                        cancelAudioRecording();
                      }
                    }}
                  >
                    <Mic className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Segure para gravar áudio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      disabled={isSending || isRecordingAudio}
                      className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation"
                    >
                      <Smile className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] sm:w-[400px] p-0" align="start">
                    <GifPicker
                      onSelectGif={(gifUrl) => {
                        handleSendGif(gifUrl);
                        setShowGifPicker(false);
                      }}
                      onClose={() => setShowGifPicker(false)}
                    />
                  </PopoverContent>
                </Popover>
                <TooltipContent>
                  <p>Enviar GIF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex-1 relative">
            {replyingTo && (
              <div className="absolute bottom-full left-0 right-0 mb-1 p-2 bg-muted border rounded-t-lg">
                <MessageReply
                  replyTo={replyingTo}
                  onCancel={() => setReplyingTo(null)}
                  isOwnMessage={false}
                />
              </div>
            )}
            <Input
              autoComplete="off"
              placeholder={replyingTo ? "Respondendo..." : "Digite uma mensagem..."}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                
                // Clear previous timeout
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                
                // Update typing indicator with debounce (500ms)
                typingTimeoutRef.current = setTimeout(() => {
                  if (e.target.value.trim().length > 0) {
                    fetch(`/api/typing/${room.id}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isTyping: true }),
                    }).catch(() => {});
                  } else {
                    fetch(`/api/typing/${room.id}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isTyping: false }),
                    }).catch(() => {});
                  }
                }, 500);
              }}
              onBlur={() => {
                // Clear timeout on blur
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                // Stop typing when input loses focus
                fetch(`/api/typing/${room.id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isTyping: false }),
                }).catch(() => {});
              }}
              disabled={isSending || isRecordingAudio}
              className="w-full text-xs sm:text-sm md:text-base min-h-[36px] sm:min-h-[40px] md:min-h-[44px]"
            />
          </div>
          
          {messageText.trim() && !isRecordingAudio ? (
            <Button type="submit" size="icon" disabled={isSending} className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation flex-shrink-0">
              {isSending ? (
                <Loader2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
              )}
            </Button>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" type="button" disabled={isSending || isRecordingAudio} className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation flex-shrink-0">
                  <Paperclip className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1">
                <div className="flex gap-1">
                  <input
                    type="file"
                    id="video-upload-popover"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleMediaUpload(e, 'video')}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => document.getElementById('video-upload-popover')?.click()}
                          disabled={isSending}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enviar vídeo</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </form>
      </footer>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
      {!room.code?.startsWith('DM-') && (
        <RoomDetails
          room={room}
          currentUser={currentUser}
          open={showRoomDetails}
          onOpenChange={setShowRoomDetails}
        />
      )}

      {forwardingMessage && (
        <ForwardMessageDialog
          open={!!forwardingMessage}
          onOpenChange={(open) => !open && setForwardingMessage(null)}
          message={forwardingMessage}
        />
      )}

      {editingMessage && (
        <EditMessageDialog
          open={!!editingMessage}
          onOpenChange={(open) => !open && setEditingMessage(null)}
          message={editingMessage}
          onMessageEdited={(editedMessage) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === editedMessage.id ? { ...m, ...editedMessage } : m))
            );
            setEditingMessage(null);
          }}
        />
      )}
    </div>
  );
}
