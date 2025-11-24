import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  animateCart?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, animateCart }) => {
  return (
    <header className="sticky top-0 z-40 bg-italian-red text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-white text-italian-red p-1 rounded-full border-2 border-italian-green">
             {/* Simple CSS Pizza Icon Representation */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none">Spagnolli</h1>
            <p className="text-xs text-italian-white font-light tracking-wider">PIZZARIA</p>
          </div>
        </div>

        <button 
          onClick={onOpenCart}
          className={`relative p-2 rounded-full transition-all duration-300 ${
            animateCart ? 'bg-white/30 scale-110' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          <ShoppingBag className={`w-6 h-6 ${animateCart ? 'animate-bounce' : ''}`} />
          {cartCount > 0 && (
            <span className={`absolute -top-1 -right-1 bg-italian-green text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-italian-red transition-transform duration-300 ${animateCart ? 'scale-125' : 'scale-100'}`}>
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};