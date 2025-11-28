
import React from 'react';
import { Phone, Clock, MapPin, Lock, Instagram, Facebook, Youtube, Store } from 'lucide-react';
import { StoreSettings } from '../types';

interface FooterProps {
  onOpenAdmin: () => void;
  settings: StoreSettings;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, settings }) => {
  const hasSocials = settings.instagram || settings.facebook || settings.youtube || settings.googleBusiness;

  return (
    <footer className="bg-stone-900 text-stone-400 py-8 mt-12">
      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-display text-xl mb-3">{settings.name}</h3>
          <p className="text-sm mb-4">A melhor pizza da região!</p>
          
          {hasSocials && (
             <div className="flex gap-4 mb-4">
               {settings.instagram && (
                 <a href={settings.instagram} target="_blank" rel="noreferrer" title="Instagram" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                    <Instagram className="w-5 h-5 text-[#E1306C]" /> {/* Cor Oficial do Instagram (aproximada) */}
                 </a>
               )}
               {settings.facebook && (
                 <a href={settings.facebook} target="_blank" rel="noreferrer" title="Facebook" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                    <Facebook className="w-5 h-5 text-[#1877F2]" /> {/* Cor Oficial do Facebook */}
                 </a>
               )}
               {settings.youtube && (
                 <a href={settings.youtube} target="_blank" rel="noreferrer" title="YouTube" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                    <Youtube className="w-5 h-5 text-[#FF0000]" /> {/* Cor Oficial do YouTube */}
                 </a>
               )}
               {settings.googleBusiness && (
                 <a href={settings.googleBusiness} target="_blank" rel="noreferrer" title="Google Meu Negócio" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                    <Store className="w-5 h-5 text-[#4285F4]" /> {/* Cor Oficial do Google Blue */}
                 </a>
               )}
             </div>
          )}

          <p className="text-xs opacity-50">© {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.</p>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" /> Contato
          </h4>
          <ul className="space-y-2 text-sm">
            {settings.phones.map((phone, idx) => (
              <li key={idx}>
                <a 
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  className="hover:text-white hover:underline transition-colors flex items-center gap-2"
                >
                  {phone}
                </a>
              </li>
            ))}
            {settings.whatsapp && (
              <li>
                <a 
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white hover:underline transition-colors flex items-center gap-2"
                >
                  WhatsApp: {settings.whatsapp}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Endereço
          </h4>
          <p className="text-sm whitespace-pre-line">
            {settings.address}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500">
             <Clock className="w-4 h-4" /> {settings.openingHours}
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 mt-8 pt-4 border-t border-stone-800 flex justify-center">
        <button 
          onClick={onOpenAdmin} 
          className="flex items-center gap-1 text-xs text-stone-700 hover:text-stone-500 transition-colors"
        >
          <Lock className="w-3 h-3" /> Área Restrita
        </button>
      </div>
    </footer>
  );
};