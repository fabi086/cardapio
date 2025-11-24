
import React from 'react';
import { Phone, Clock, MapPin, Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="bg-stone-900 text-stone-400 py-8 mt-12">
      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-display text-xl mb-3">Spagnolli Pizzaria</h3>
          <p className="text-sm mb-2">A melhor pizza de Itupeva e região!</p>
          <p className="text-xs opacity-50">© 2025 Spagnolli. Todos os direitos reservados.</p>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" /> Contato
          </h4>
          <ul className="space-y-1 text-sm">
            <li>4496-4188</li>
            <li>4496-4186</li>
            <li>(11) 99914-7399</li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Endereço
          </h4>
          <p className="text-sm">
            Av. Itália, 112 - Centro<br/>
            Itupeva - SP
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500">
             <Clock className="w-4 h-4" /> Aberto todos os dias
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
