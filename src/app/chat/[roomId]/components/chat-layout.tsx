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
import { addNotification, markNotificationsAsRead } from '@/lib/storage/notifications';
import { getCachedUser, saveUserToCache } from '@/lib/storage/room-cache';
import { MessageReactions } from '@/components/chat/message-reactions';
import { MessageReply } from '@/components/chat/message-reply';
import { ForwardMessageDialog } from '@/components/chat/forward-message-dialog';
import { MessageSearch } from '@/components/chat/message-search';

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
  const [showSearch, setShowSearch] = useState(false);
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

  // Scroll to bottom when messages change or component mounts
  useEffect(() => {
    // Usar requestAnimationFrame para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [messages.length]);

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
    const channel = subscribeToMessages(room.id, async (newMessage) => {
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
          return updated;
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
          return updated;
        }
        
        // Nova mensagem de outro usuário ou do servidor
        // Add to cache
        addMessageToCache(room.id, appMessage);
        
        // Only add notification if message is not from current user
        if (serverSenderId !== currentUser.id) {
          addNotification(room.id, appMessage);
          
          // Disparar evento customizado para notificação em tempo real
          // Apenas se não estiver na sala atual
          const currentPath = window.location.pathname;
          const isInCurrentRoom = currentPath.includes(`/chat/${room.id}`);
          
          if (!isInCurrentRoom) {
            window.dispatchEvent(
              new CustomEvent('newMessageNotification', {
                detail: {
                  roomId: room.id,
                  message: appMessage,
                  currentRoomId: currentPath.split('/chat/')[1]?.split('/')[0] || null,
                },
              })
            );
          }
        }
        
        // Adicionar mensagem com senderId do servidor
        return [...prev, {
          ...appMessage,
          senderId: serverSenderId, // SEMPRE usar o senderId do servidor
        }];
      });
    });

    channelRef.current = channel;

    // Mark notifications as read when component mounts
    markNotificationsAsRead(room.id);

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
      }
    };
  }, [room.id, currentUser.id]);

  // Update messages when initialMessages change
  useEffect(() => {
    // Remove duplicates before setting messages
    const uniqueMessages = initialMessages.filter((msg, index, self) => 
      index === self.findIndex(m => m.id === msg.id)
    );
    setMessages(uniqueMessages);
    // Check if there are more messages based on initial load
    setHasMoreMessages(uniqueMessages.length >= 8);
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
        `/api/messages/${room.id}?limit=8&before=${beforeDate.toISOString()}`
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
          
          // Update cache with merged messages
          saveMessagesToCache(room.id, uniqueMerged);
          
          return uniqueMerged;
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

    const text = messageText.trim();
    
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
    };

    // 1. Limpar input IMEDIATAMENTE para feedback visual instantâneo
    setMessageText('');
    setReplyingTo(null);
    
    // 2. Adicionar mensagem ao estado IMEDIATAMENTE (antes de qualquer requisição)
    setMessages((prev) => [...prev, optimisticMessage]);
    
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
            replyToId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          
          // Atualizar status da mensagem otimista para erro
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, status: 'error' as const }
                : msg
            )
          );

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
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempId
                  ? { 
                      ...msg, 
                      id: data.message.id,
                      senderId: data.message.senderId, // SEMPRE usar o senderId do servidor
                      status: 'sent' as const,
                    }
                  : msg
              )
            );
          }
        }
      } catch (error) {
        // Atualizar status da mensagem otimista para erro
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          )
        );

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
    setMessages((prev) => [...prev, optimisticMessage]);
    
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          )
        );

        toast({
          title: 'Erro ao enviar mídia',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
      } else {
        const data = await response.json();
        if (data.message?.id) {
          // Atualizar mensagem otimista com ID real e URL do servidor
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, id: data.message.id, mediaUrl: url, status: 'sent' as const }
                : msg
            )
          );
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
    setMessages((prev) => [...prev, optimisticMessage]);
    
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          )
        );

        toast({
          title: 'Erro ao enviar foto',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
      } else {
        const data = await response.json();
        if (data.message?.id) {
          // Atualizar mensagem otimista com ID real e URL do servidor
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, id: data.message.id, mediaUrl: url, status: 'sent' as const }
                : msg
            )
          );
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
    setMessages((prev) => [...prev, optimisticMessage]);
    
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: 'error' as const }
              : msg
          )
        );

        toast({
          title: 'Erro ao enviar áudio',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        });
      } else {
        const data = await response.json();
        if (data.message?.id) {
          // Atualizar mensagem otimista com ID real e URL do servidor
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, id: data.message.id, mediaUrl: url, status: 'sent' as const }
                : msg
            )
          );
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
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col relative">
      {/* Chat Header */}
      <header className="flex h-16 items-center justify-between border-b-2 border-primary/30 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-sm px-2 sm:px-4 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
              <AvatarImage src={otherUser?.avatarUrl} />
              <AvatarFallback>{getInitials(otherUser?.name || room.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm sm:text-base truncate" title={otherUser?.name || room.name}>
                {otherUser?.name || room.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {room.code?.startsWith('DM-') ? 'Conversa direta' : `${room.members.length} membros`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                        <Button variant="ghost" size="icon">
                          <QrCode className="h-5 w-5" />
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
                  >
                    <Info className="h-5 w-5" />
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

      {/* Message Area */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {messages
            .filter((msg, index, self) => index === self.findIndex(m => m.id === msg.id))
            .map((message, index) => {
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
                  setReplyingTo(message);
                  document.body.removeChild(menu);
                };
                
                const forwardBtn = document.createElement('button');
                forwardBtn.className = 'w-full text-left px-3 py-2 hover:bg-muted rounded text-sm';
                forwardBtn.textContent = 'Encaminhar';
                forwardBtn.onclick = () => {
                  setForwardingMessage(message);
                  document.body.removeChild(menu);
                };
                
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
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.user?.avatarUrl} />
                  <AvatarFallback>{getInitials(message.user?.name)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs md:max-w-md lg:max-w-lg rounded-3xl p-4 text-sm flex flex-col shadow-md',
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
                  </div>
                )}
                {message.text && !message.text.match(/^(📷|🎥|🎵)/) && <p>{message.text}</p>}
                <div className="flex items-center gap-1 mt-1 self-end">
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
            </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <TypingIndicator roomId={room.id} currentUserId={currentUser.id} />
      </ScrollArea>

      {/* Input Area - Fixed at bottom */}
      <footer className="fixed bottom-0 left-0 right-0 border-t-2 border-primary/30 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 shadow-md z-20 bg-background">
        {isRecordingAudio && (
          <div className={cn(
            "px-4 py-2 border-b flex items-center justify-between transition-colors",
            shouldCancelRecording 
              ? "bg-destructive/20" 
              : "bg-destructive/10"
          )}>
            <div className="flex items-center gap-2 flex-1">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-mono">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <span className={cn(
              "text-sm font-medium",
              shouldCancelRecording 
                ? "text-destructive" 
                : "text-muted-foreground"
            )}>
              {shouldCancelRecording ? 'Solte para cancelar' : 'Solte para enviar'}
            </span>
          </div>
        )}
        <form
          className="flex w-full items-center gap-2 p-2 md:p-4"
          onSubmit={handleSendMessage}
        >
          <div className="flex items-center gap-1">
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
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Camera className="h-5 w-5" />
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
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ImageIcon className="h-5 w-5" />
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
                      "text-muted-foreground hover:text-foreground hover:bg-primary/10",
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
                    <Mic className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Segure para gravar áudio</p>
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
                // Update typing indicator
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
              }}
              onBlur={() => {
                // Stop typing when input loses focus
                fetch(`/api/typing/${room.id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isTyping: false }),
                }).catch(() => {});
              }}
              disabled={isSending || isRecordingAudio}
              className="w-full"
            />
          </div>
          
          {messageText.trim() && !isRecordingAudio ? (
            <Button type="submit" size="icon" disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" type="button" disabled={isSending || isRecordingAudio}>
                  <Paperclip className="h-5 w-5" />
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
    </div>
  );
}
