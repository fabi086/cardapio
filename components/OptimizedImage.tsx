
import React, { useState, useEffect } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';

interface OptimizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  width?: number; // Largura desejada para otimização (px)
  height?: number;
  fill?: boolean; // Se deve preencher o pai (object-cover)
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  width = 800,
  fill = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    if (!src) {
      setHasError(true);
      return;
    }

    // Lógica de Otimização de URL
    let optimizedUrl = src;

    // 1. Otimização para Unsplash
    if (src.includes('images.unsplash.com')) {
      const separator = src.includes('?') ? '&' : '?';
      // Adiciona parâmetros de qualidade (q), formato (auto=format -> webp/avif) e largura (w)
      if (!src.includes('w=')) {
        optimizedUrl = `${src}${separator}w=${width}&q=80&auto=format&fit=crop`;
      }
    }

    // 2. Imagens Base64 (já carregadas, apenas exibe)
    // Não alteramos Base64, mas o AdminPanel agora comprime antes de salvar.

    setCurrentSrc(optimizedUrl);
    setHasError(false);
    setIsLoaded(false); // Reset load state on src change
  }, [src, width]);

  if (hasError || !src) {
    return (
      <div className={`flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600 ${className} ${fill ? 'w-full h-full' : ''}`}>
        <ImageOff className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className} ${fill ? 'w-full h-full' : ''}`}>
      {/* Placeholder / Skeleton Loading */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 bg-stone-200 dark:bg-stone-800 animate-pulse flex items-center justify-center">
           <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
        </div>
      )}
      
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`transition-opacity duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'} ${fill ? 'w-full h-full object-cover' : ''}`}
      />
    </div>
  );
};
