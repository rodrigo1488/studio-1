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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock } from 'lucide-react';

interface TemporaryMessageSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

const TTL_OPTIONS = [
  { value: null, label: 'Desativado' },
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 1440, label: '24 horas' },
];

export function TemporaryMessageSettings({
  open,
  onOpenChange,
  roomId,
}: TemporaryMessageSettingsProps) {
  const [ttlMinutes, setTtlMinutes] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && roomId) {
      fetchTTL();
    }
  }, [open, roomId]);

  const fetchTTL = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/temporary-messages`);
      if (response.ok) {
        const data = await response.json();
        setTtlMinutes(data.ttlMinutes);
      }
    } catch (error) {
      console.error('Error fetching TTL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/temporary-messages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttlMinutes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar configuração');
      }

      toast({
        title: 'Configuração salva',
        description: ttlMinutes 
          ? `Mensagens temporárias ativadas (${TTL_OPTIONS.find(o => o.value === ttlMinutes)?.label})`
          : 'Mensagens temporárias desativadas',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a configuração',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Mensagens Temporárias
          </DialogTitle>
          <DialogDescription>
            Configure mensagens que se auto-destruem após um período de tempo
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="ttl">Tempo de expiração:</Label>
                <Select
                  value={ttlMinutes?.toString() || 'null'}
                  onValueChange={(value) => setTtlMinutes(value === 'null' ? null : parseInt(value))}
                >
                  <SelectTrigger id="ttl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TTL_OPTIONS.map((option) => (
                      <SelectItem key={option.value?.toString() || 'null'} value={option.value?.toString() || 'null'}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ttlMinutes 
                    ? `As mensagens enviadas nesta conversa serão automaticamente deletadas após ${TTL_OPTIONS.find(o => o.value === ttlMinutes)?.label.toLowerCase()}`
                    : 'As mensagens não expirarão automaticamente'}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



