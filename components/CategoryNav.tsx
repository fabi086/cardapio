import React, { useRef } from 'react';
import { Category } from '../types';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

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
    <nav id="tour-categories" className="sticky top-[72px] z-30 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 transition-colors duration-300 py-4">
      <div className="max-w-5xl mx-auto px-4 relative flex items-center group">
        
        {/* Left Arrow */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 md:-left-4 z-10 p-2 rounded-full bg-white shadow-md text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all focus:outline-none disabled:opacity-0 opacity-80 md:opacity-0 group-hover:opacity-100 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <ul 
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 px-1 pb-2 hide-scrollbar scroll-smooth w-full"
        >
          {categories.map((cat) => (
            <li key={cat.id} className="shrink-0">
              <button
                onClick={() => onSelectCategory(cat.id)}
                className="flex flex-col items-center gap-2 group/item min-w-[80px] md:min-w-[100px]"
              >
                <div 
                  className={`w-20 h-16 md:w-24 md:h-16 rounded-xl overflow-hidden shadow-sm transition-all duration-300 relative ${
                    activeCategory === cat.id 
                      ? 'ring-2 ring-italian-red scale-105' 
                      : 'hover:scale-105 hover:shadow-md'
                  }`}
                >
                   {cat.image ? (
                     <img 
                       src={cat.image} 
                       alt={cat.name} 
                       className="w-full h-full object-cover"
                     />
                   ) : (
                     <div className="w-full h-full bg-white dark:bg-stone-800 flex items-center justify-center">
                        <ImageOff className="w-6 h-6 text-stone-300" />
                     </div>
                   )}
                   {activeCategory === cat.id && (
                     <div className="absolute inset-0 bg-italian-red/10" />
                   )}
                </div>
                
                <span 
                  className={`text-xs md:text-sm font-medium text-center line-clamp-2 leading-tight transition-colors px-1 ${
                    activeCategory === cat.id
                      ? 'text-italian-red font-bold'
                      : 'text-stone-600 group-hover/item:text-stone-800 dark:text-stone-400 dark:group-hover/item:text-stone-200'
                  }`}
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
          className="absolute right-0 md:-right-4 z-10 p-2 rounded-full bg-white shadow-md text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all focus:outline-none opacity-80 md:opacity-0 group-hover:opacity-100 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          aria-label="Rolar para direita"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

      </div>
    </nav>
  );
};