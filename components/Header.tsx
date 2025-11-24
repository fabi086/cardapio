import React, { useState } from 'react';
import { ShoppingBag, Moon, Sun, Phone, Info } from 'lucide-react';

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
               <div className="bg-white text-italian-red p-1 rounded-full border-2 border-italian-green shrink-0">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
               </div>
               <div className="flex flex-col justify-center">
                  <h1 className="font-display text-lg sm:text-2xl leading-none break-words max-w-[200px] sm:max-w-xs">{storeName}</h1>
               </div>
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-1 md:gap-3">
          
          {/* Contact Buttons (Desktop: Text+Icon, Mobile: Icon only) */}
          <div id="tour-contacts" className="hidden md:flex items-center gap-2 mr-2 border-r border-white/20 pr-4">
             <a 
               href={whatsLink}
               target="_blank" 
               rel="noreferrer"
               className="flex items-center gap-1 text-xs font-bold hover:bg-white/10 px-2 py-1.5 rounded transition-colors"
               title="Chamar no WhatsApp"
             >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg> WhatsApp
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
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
          
          {/* Info Button */}
          <button 
             id="tour-info"
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
            id="tour-cart"
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