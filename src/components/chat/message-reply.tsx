'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, User } from '@/lib/data';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

interface MessageReplyProps {
  replyTo: Message & { user?: User };
  onCancel?: () => void;
  isOwnMessage?: boolean;
}

export function MessageReply({ replyTo, onCancel, isOwnMessage = false }: MessageReplyProps) {
  return (
    <div className={cn(
      'flex items-start gap-2 p-2 rounded-lg border-l-4 mb-2 text-xs',
      isOwnMessage
        ? 'bg-primary/10 border-primary'
        : 'bg-muted border-muted-foreground/30'
    )}>
      <div className="flex-1 min-w-0">
        {replyTo.senderId ? (
          <Link 
            href={`/profile/${replyTo.senderId}`}
            className="font-semibold text-xs mb-1 hover:underline block"
          >
            {replyTo.user?.name || 'Usuário'}
          </Link>
        ) : (
          <p className="font-semibold text-xs mb-1">
            {replyTo.user?.name || 'Usuário'}
          </p>
        )}
        <p className="text-muted-foreground truncate">
          {replyTo.text || (replyTo.mediaUrl ? 'Mídia' : 'Mensagem')}
        </p>
      </div>
      {onCancel && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={onCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

