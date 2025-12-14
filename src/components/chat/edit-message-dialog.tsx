'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Message } from '@/lib/data';

interface EditMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  onMessageEdited: (message: Message) => void;
}

export function EditMessageDialog({
  open,
  onOpenChange,
  message,
  onMessageEdited,
}: EditMessageDialogProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (message && open) {
      setText(message.text);
    }
  }, [message, open]);

  const handleSubmit = async () => {
    if (!message || !text.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/messages/${message.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao editar mensagem');
      }

      const data = await response.json();
      const editedMessage = {
        ...data.message,
        timestamp: new Date(data.message.timestamp),
        editedAt: data.message.editedAt ? new Date(data.message.editedAt) : undefined,
      };

      onMessageEdited(editedMessage);
      onOpenChange(false);
      toast({
        title: 'Mensagem editada',
        description: 'A mensagem foi editada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível editar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Mensagem</DialogTitle>
          <DialogDescription>
            Edite o texto da sua mensagem. Você só pode editar mensagens dentro de 15 minutos após o envio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-h-[100px] resize-none"
            disabled={isSubmitting}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !text.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Editando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

