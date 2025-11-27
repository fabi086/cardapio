
import React, { useRef } from 'react';
import { Category } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({ categories, activeCategory, onSelectCategory }) => {
  const scrollRef = useRef<HTMLUListElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 250;
      current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <nav id="tour-categories" className="relative border-b border-stone-200 dark:border-stone-800 transition-colors duration-300 py-4" style={{ backgroundColor: 'var(--bg-body, #f5f5f4)' }}>
      <div className="max-w-5xl mx-auto px-4 relative flex items-center group justify-center">
        
        {/* Left Arrow */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 md:-left-4 z-10 p-2 rounded-full bg-white shadow-md border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all focus:outline-none disabled:opacity-0 opacity-80 md:opacity-0 group-hover:opacity-100 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:border-stone-700"
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <ul 
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 px-1 pb-2 hide-scrollbar scroll-smooth w-full justify-center"
        >
          {categories.map((cat) => (
            <li key={cat.id} className="shrink-0">
              <button
                onClick={() => onSelectCategory(cat.id)}
                className="flex flex-col items-center gap-2 group/item min-w-[80px] md:min-w-[100px]"
              >
                <div 
                  className={`w-20 h-16 md:w-24 md:h-16 rounded-xl overflow-hidden shadow-sm border transition-all duration-300 relative ${
                    activeCategory === cat.id 
                      ? 'ring-2 scale-105 shadow-md' 
                      : 'border-stone-200 hover:scale-105 hover:shadow-md opacity-90 hover:opacity-100 hover:border-stone-300 dark:border-stone-700'
                  }`}
                  style={activeCategory === cat.id ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 2px var(--color-primary)' } : {}}
                >
                   <OptimizedImage 
                     src={cat.image} 
                     alt={cat.name} 
                     width={150} 
                     fill
                     className="transition-transform duration-300"
                   />
                   {activeCategory === cat.id && (
                     <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundColor: 'var(--color-primary)' }} />
                   )}
                </div>
                
                <span 
                  className={`text-xs md:text-sm font-bold text-center line-clamp-2 leading-tight transition-colors px-1 ${
                    activeCategory === cat.id
                      ? 'scale-105'
                      : 'group-hover/item:opacity-100 text-stone-600 dark:text-stone-400'
                  }`}
                  style={{ 
                      color: activeCategory === cat.id ? 'var(--color-primary)' : undefined,
                      opacity: activeCategory === cat.id ? 1 : 0.8
                  }}
                >
                  {cat.name}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Right Arrow */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 md:-right-4 z-10 p-2 rounded-full bg-white shadow-md border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all focus:outline-none opacity-80 md:opacity-0 group-hover:opacity-100 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:border-stone-700"
          aria-label="Rolar para direita"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

      </div>
    </nav>
  );
};
