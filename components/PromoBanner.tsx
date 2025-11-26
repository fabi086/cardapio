
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';

interface PromoBannerProps {
  promotions: Product[];
  onAddToCart: (product: Product) => void;
  currencySymbol?: string;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ promotions, onAddToCart, currencySymbol = 'R$' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (promotions.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promotions.length]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % promotions.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? promotions.length - 1 : prev - 1));

  if (!promotions || promotions.length === 0) return null;

  const currentPromo = promotions[currentIndex];

  return (
    <div className="relative w-full h-64 md:h-72 rounded-2xl overflow-hidden shadow-lg mb-8 group bg-stone-900">
      <div className="absolute inset-0">
        <OptimizedImage 
          key={currentPromo.id} 
          src={currentPromo.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop'}
          alt={currentPromo.name}
          width={1000} 
          fill
          className="opacity-60 transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent pointer-events-none" />
      </div>

      <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-10 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 key={currentIndex}">
        <span className="bg-italian-red w-fit text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3 shadow-md">
          Destaque do Dia
        </span>
        <h2 className="text-3xl md:text-5xl font-display text-white mb-2 leading-tight">
          {currentPromo.name}
        </h2>
        <p className="text-stone-300 text-sm md:text-base mb-6 line-clamp-2 max-w-md">
          {currentPromo.description}
        </p>
        
        <div className="flex items-center gap-4">
          <div className="text-2xl md:text-3xl font-bold text-italian-green">
            {currencySymbol} {currentPromo.price.toFixed(2).replace('.', ',')}
          </div>
          <button 
            onClick={() => onAddToCart(currentPromo)}
            className="bg-white text-stone-900 px-6 py-2.5 rounded-full font-bold hover:bg-stone-200 transition-colors flex items-center gap-2 shadow-lg active:scale-95 transform"
          >
            <ShoppingBag className="w-5 h-5" /> Peça Agora
          </button>
        </div>
      </div>

      {promotions.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {promotions.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/80'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
