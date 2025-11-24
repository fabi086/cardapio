import React from 'react';
import { Category } from '../types';

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({ categories, activeCategory, onSelectCategory }) => {
  return (
    <nav className="bg-white shadow-sm sticky top-[60px] z-30 border-b border-stone-200 dark:bg-stone-900 dark:border-stone-800 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        <ul className="flex overflow-x-auto py-3 px-4 gap-4 hide-scrollbar snap-x">
          {categories.map((cat) => (
            <li key={cat.id} className="snap-start shrink-0">
              <button
                onClick={() => onSelectCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-italian-green text-white shadow-md'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};