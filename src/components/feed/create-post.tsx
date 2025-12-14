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
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[90vh] h-[100vh] sm:h-auto w-full sm:w-auto m-0 sm:m-auto rounded-none sm:rounded-lg p-3 sm:p-4 md:p-6">
        <DialogHeader className="pb-2 sm:pb-3">
          <DialogTitle className="text-base sm:text-lg md:text-xl">Criar nova publicação</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 overflow-y-auto flex-1">
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
              className="w-full text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-11 touch-manipulation"
            >
              <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1.5 sm:mr-2" />
              Selecionar fotos
            </Button>
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 md:gap-4 max-h-[35vh] sm:max-h-[40vh] md:max-h-none overflow-y-auto">
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
                    className="absolute top-1 right-1 sm:top-2 sm:right-2 h-7 w-7 sm:h-8 sm:w-8 bg-black/50 hover:bg-black/70 text-white touch-manipulation"
                    onClick={() => removeFile(index)}
                    aria-label="Remover imagem"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
              className="min-h-[100px] sm:min-h-[120px] md:min-h-[140px] resize-none text-xs sm:text-sm md:text-base"
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
          <div className="flex justify-end gap-1.5 sm:gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={isSubmitting}
              className="text-xs sm:text-sm md:text-base h-8 sm:h-9 md:h-10 px-3 sm:px-4 touch-manipulation"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || selectedFiles.length === 0}
              className="text-xs sm:text-sm md:text-base h-8 sm:h-9 md:h-10 px-3 sm:px-4 touch-manipulation"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1.5 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Publicando...</span>
                  <span className="sm:hidden">...</span>
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

