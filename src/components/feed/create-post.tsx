'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { MentionSelector } from './mention-selector';
import type { User } from '@/lib/data';

interface CreatePostProps {
  open: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export function CreatePost({ open, onClose, onPostCreated }: CreatePostProps) {
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCurrentUser();
    }
  }, [open]);

  // Handle browser back button and mobile back button
  useEffect(() => {
    if (!open) return;

    // Push state to history when dialog opens
    const state = { dialogOpen: true, timestamp: Date.now() };
    window.history.pushState(state, '');

    const handlePopState = () => {
      // When user clicks back button, close the dialog
      if (open) {
        handleClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.user?.id || '');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'Arquivo muito grande',
            description: `${file.name} é maior que 10MB.`,
            variant: 'destructive',
          });
          return;
        }
        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      } else {
        toast({
          title: 'Tipo de arquivo inválido',
          description: `${file.name} não é uma imagem válida.`,
          variant: 'destructive',
        });
      }
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'Selecione pelo menos uma imagem',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (selectedUsers.length > 0) {
        formData.append('mentionedUserIds', JSON.stringify(selectedUsers.map((u) => u.id)));
      }
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/feed/create', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, browser will set it with boundary for FormData
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || 'Erro ao criar post';
        const errorDetails = data.details ? `\n\nDetalhes: ${data.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      const data = await response.json();
      
      // Convert ISO strings back to Date objects
      if (data.post) {
        const postWithDates = {
          ...data.post,
          createdAt: new Date(data.post.createdAt),
          updatedAt: new Date(data.post.updatedAt),
          media: (data.post.media || []).map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          })),
        };
      }

      toast({
        title: 'Post criado!',
        description: 'Seu post foi publicado com sucesso.',
      });

      // Reset form
      setDescription('');
      setSelectedFiles([]);
      setSelectedUsers([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
      onPostCreated();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar post',
        description: error.message || 'Ocorreu um erro ao criar o post.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setDescription('');
    setSelectedFiles([]);
    setSelectedUsers([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[90vh] h-[100vh] sm:h-auto w-full sm:w-auto m-0 sm:m-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Criar nova publicação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Selecionar fotos
            </Button>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 max-h-[40vh] sm:max-h-none overflow-y-auto">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <Textarea
              placeholder="Escreva uma legenda..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Mention Selector */}
          {currentUserId && (
            <MentionSelector
              selectedUsers={selectedUsers}
              onUsersChange={setSelectedUsers}
              currentUserId={currentUserId}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || selectedFiles.length === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

