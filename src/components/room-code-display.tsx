'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Share2, QrCode } from 'lucide-react';
import { useState } from 'react';

interface RoomCodeDisplayProps {
  code: string;
  roomName?: string;
  trigger?: React.ReactNode;
  showInModal?: boolean;
}

export function RoomCodeDisplay({
  code,
  roomName,
  trigger,
  showInModal = false,
}: RoomCodeDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: 'Código copiado!',
        description: 'O código foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    const shareText = roomName
      ? `Entre na sala "${roomName}" usando o código: ${code}`
      : `Entre na sala usando o código: ${code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: roomName || 'Convite para Sala',
          text: shareText,
        });
        toast({
          title: 'Compartilhado!',
          description: 'O código foi compartilhado com sucesso.',
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          toast({
            title: 'Erro ao compartilhar',
            description: 'Não foi possível compartilhar o código.',
            variant: 'destructive',
          });
        }
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  const codeDisplay = (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="flex items-center justify-center rounded-2xl border-4 border-primary bg-primary/5 p-8 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Código da Sala
              </p>
              <div className="flex items-center gap-2">
                <span className="text-5xl font-bold tracking-widest text-primary">
                  {code}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Código
              </>
            )}
          </Button>
          <Button
            onClick={handleShare}
            variant="default"
            className="flex-1"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground max-w-sm">
          Compartilhe este código com quem você deseja convidar para a sala.
          Eles podem usá-lo para entrar na sala.
        </p>
      </div>
    </div>
  );

  if (showInModal) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <QrCode className="mr-2 h-4 w-4" />
              Ver Código
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {roomName ? `Código da Sala: ${roomName}` : 'Código da Sala'}
            </DialogTitle>
            <DialogDescription>
              Compartilhe este código para convidar pessoas para a sala.
            </DialogDescription>
          </DialogHeader>
          {codeDisplay}
        </DialogContent>
      </Dialog>
    );
  }

  return codeDisplay;
}

