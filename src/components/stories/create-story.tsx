'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/media/camera-capture';

interface CreateStoryProps {
  open: boolean;
  onClose: () => void;
  onStoryCreated?: () => void;
}

export function CreateStory({ open, onClose, onStoryCreated }: CreateStoryProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setMediaType('image');
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, selecione uma imagem ou vídeo',
        variant: 'destructive',
      });
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setMediaType('image');
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: 'Selecione uma mídia',
        description: 'Por favor, selecione uma imagem ou vídeo para criar sua story',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mediaType', mediaType);

      const response = await fetch('/api/stories/create', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar story');
      }

      toast({
        title: 'Story criada!',
        description: 'Sua story foi publicada com sucesso e expira em 24 horas.',
      });

      // Reset form
      setSelectedFile(null);
      setPreview(null);
      if (preview) {
        URL.revokeObjectURL(preview);
      }

      onStoryCreated?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar story',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    setShowCamera(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md w-full h-[100vh] sm:h-auto m-0 sm:m-auto rounded-none sm:rounded-lg p-3 sm:p-4 md:p-6">
          <DialogHeader className="pb-2 sm:pb-3">
            <DialogTitle className="text-base sm:text-lg md:text-xl">Criar Story</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Compartilhe um momento que expira em 24 horas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            {!preview ? (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex gap-1.5 sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-11 touch-manipulation"
                    onClick={() => {
                      setMediaType('image');
                      fileInputRef.current?.click();
                    }}
                  >
                    <Camera className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    Foto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-11 touch-manipulation"
                    onClick={() => {
                      setMediaType('video');
                      fileInputRef.current?.click();
                    }}
                  >
                    <Video className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    Vídeo
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-11 touch-manipulation"
                  onClick={() => setShowCamera(true)}
                >
                  <Camera className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  Tirar Foto/Vídeo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 sm:right-2 sm:top-2 z-10 h-7 w-7 sm:h-8 sm:w-8 bg-black/50 hover:bg-black/70 text-white touch-manipulation"
                  onClick={() => {
                    if (preview) {
                      URL.revokeObjectURL(preview);
                    }
                    setPreview(null);
                    setSelectedFile(null);
                  }}
                  aria-label="Remover mídia"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                {mediaType === 'image' ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-48 sm:h-56 md:h-64 w-full rounded-lg object-cover"
                  />
                ) : (
                  <video
                    src={preview}
                    className="h-48 sm:h-56 md:h-64 w-full rounded-lg object-cover"
                    controls
                  />
                )}
              </div>
            )}

            <div className="flex gap-1.5 sm:gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 text-xs sm:text-sm md:text-base h-8 sm:h-9 md:h-10 touch-manipulation"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedFile || isSubmitting}
                className="flex-1 text-xs sm:text-sm md:text-base h-8 sm:h-9 md:h-10 touch-manipulation"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 animate-spin" />
                    <span className="hidden sm:inline">Publicando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Publicar Story</span>
                    <span className="sm:hidden">Publicar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showCamera && (
        <CameraCapture
          open={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </>
  );
}

