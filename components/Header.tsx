import React, { useState } from 'react';
import { ShoppingBag, Moon, Sun, Phone, MessageCircle, Info } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  animateCart?: boolean;
  storeName: string;
  logoUrl: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  whatsapp: string;
  phone: string;
  onOpenInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  cartCount, 
  onOpenCart, 
  animateCart, 
  storeName, 
  logoUrl,
  isDarkMode,
  onToggleTheme,
  whatsapp,
  phone,
  onOpenInfo
}) => {
  const [logoError, setLogoError] = useState(false);

  // Helper to format whatsapp link
  const whatsLink = `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
  const phoneLink = `tel:${phone.replace(/[^\d+]/g, '')}`;

  return (
    <header className="sticky top-0 z-40 bg-italian-red text-white shadow-md dark:bg-red-950 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-2 flex justify-between items-center h-[72px]">
        
        {/* Logo Section */}
        <div className="flex items-center gap-2 h-full cursor-pointer" onClick={onOpenInfo}>
          {!logoError && logoUrl ? (
             <img 
               src={logoUrl} 
               alt={storeName} 
               className="h-full w-auto object-contain max-w-[180px] md:max-w-[220px] py-1"
               onError={() => setLogoError(true)}
             />
          ) : (
            <div className="flex items-center gap-2 animate-in fade-in">
               <div className="bg-white text-italian-red p-1 rounded-full border-2 border-italian-green">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
               </div>
               <div className="hidden sm:block">
                  <h1 className="font-display text-2xl leading-none">{storeName.split(' ')[0]}</h1>
                  <p className="text-xs text-italian-white font-light tracking-wider">PIZZARIA</p>
               </div>
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-1 md:gap-3">
          
          {/* Contact Buttons (Desktop: Text+Icon, Mobile: Icon only) */}
          <div className="hidden md:flex items-center gap-2 mr-2 border-r border-white/20 pr-4">
             <a 
               href={whatsLink}
               target="_blank" 
               rel="noreferrer"
               className="flex items-center gap-1 text-xs font-bold hover:bg-white/10 px-2 py-1.5 rounded transition-colors"
               title="Chamar no WhatsApp"
             >
                <MessageCircle className="w-4 h-4" /> WhatsApp
             </a>
             <a 
               href={phoneLink}
               className="flex items-center gap-1 text-xs font-bold hover:bg-white/10 px-2 py-1.5 rounded transition-colors"
               title="Ligar Agora"
             >
                <Phone className="w-4 h-4" /> Ligar
             </a>
          </div>

          {/* Mobile Contact Icons */}
          <a href={whatsLink} target="_blank" rel="noreferrer" className="md:hidden p-2 rounded-full hover:bg-white/10 text-white">
            <MessageCircle className="w-5 h-5" />
          </a>
          
          {/* Info Button */}
          <button 
             onClick={onOpenInfo}
             className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
             title="Informações da Loja"
          >
             <Info className="w-6 h-6" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>

          {/* Cart Button */}
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
      </div>
    </header>
  );
};