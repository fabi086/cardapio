
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Volume2, VolumeX } from 'lucide-react';

interface GuideStep {
  targetId: string;
  title: string;
  description: string;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const STEPS: GuideStep[] = [
  {
    targetId: 'tour-search',
    title: 'Busca Rápida',
    description: 'Encontre seus sabores favoritos ou bebidas digitando aqui. Você também pode filtrar por categoria.',
    position: 'bottom'
  },
  {
    targetId: 'tour-categories',
    title: 'Navegue pelo Cardápio',
    description: 'Use este menu deslizante para ver Pizzas, Esfihas, Bebidas e muito mais.',
    position: 'bottom'
  },
  {
    targetId: 'tour-product-card',
    title: 'Adicione ao Pedido',
    description: 'Clique em "Adicionar" ou "Configurar" para escolher bordas, adicionais e incluir no carrinho.',
    position: 'top'
  },
  {
    targetId: 'tour-cart',
    title: 'Seu Carrinho',
    description: 'Aqui você vê o resumo do pedido. Clique para revisar e finalizar.',
    position: 'bottom'
  },
  {
    targetId: 'tour-contacts',
    title: 'Fale Conosco',
    description: 'Dúvidas? Chame no WhatsApp ou ligue diretamente para a loja por aqui.',
    position: 'bottom'
  }
];

interface OnboardingGuideProps {
  onClose: () => void;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);
  
  // Voice State
  const [isMuted, setIsMuted] = useState(false);
  const hasSpokenRef = useRef(false);

  // Speech Function
  const speakText = (text: string) => {
    if (isMuted || typeof window === 'undefined') return;
    
    // Cancel previous speech to avoid overlapping
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR'; // Brazilian Portuguese
    utterance.rate = 1.1; // Slightly faster for better flow
    utterance.pitch = 1;
    
    // Try to find a good PT-BR voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const updatePosition = () => {
      const step = STEPS[currentStep];
      const element = document.getElementById(step.targetId);

      if (element) {
        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
        setIsVisible(true);
        
        // Speak the content
        // We add a small delay to allow the scroll to finish and user to focus
        setTimeout(() => {
             speakText(`${step.title}. ${step.description}`);
        }, 500);

      } else {
        // Element not found (maybe filtered out), try next step or skip
        console.warn(`Guide element not found: ${step.targetId}`);
      }
    };

    // Small delay to ensure rendering
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.speechSynthesis.cancel(); // Stop speaking when unmounting or changing step
    };
  }, [currentStep]);

  // Handle Mute Toggle re-triggering speech if unmuted
  useEffect(() => {
      if (!isMuted && isVisible) {
          const step = STEPS[currentStep];
          speakText(`${step.title}. ${step.description}`);
      } else {
          window.speechSynthesis.cancel();
      }
  }, [isMuted]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
      window.speechSynthesis.cancel();
      onClose();
  }

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  // Tooltip positioning logic
  const tooltipStyle: React.CSSProperties = {};
  if (step.position === 'bottom') {
    tooltipStyle.top = position.top + position.height + 15;
    tooltipStyle.left = position.left + (position.width / 2) - 150; // Center roughly
  } else if (step.position === 'top') {
    tooltipStyle.top = position.top - 180; // Approximate height of tooltip
    tooltipStyle.left = position.left + (position.width / 2) - 150;
  }
  
  // Mobile adjustment: clamp left
  if (window.innerWidth < 768) {
      tooltipStyle.left = 20;
      tooltipStyle.right = 20;
      tooltipStyle.width = 'auto';
  } else {
      tooltipStyle.width = 300;
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Semi-transparent overlay with a "hole" */}
      <div 
        className="absolute transition-all duration-300 ease-out border-2 border-italian-green rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
        style={{
          top: position.top - window.scrollY - 5, // Account for padding
          left: position.left - 5,
          width: position.width + 10,
          height: position.height + 10,
        }}
      />

      {/* Tooltip Card */}
      <div 
        className="absolute bg-white rounded-xl shadow-2xl p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300"
        style={{
           ...tooltipStyle,
           top: (tooltipStyle.top as number) - window.scrollY // Adjust for fixed position relative to viewport
        }}
      >
        <div className="flex justify-between items-start">
           <div className="flex items-center gap-2">
               <h3 className="font-bold text-lg text-italian-red">{step.title}</h3>
               <button 
                 onClick={() => setIsMuted(!isMuted)} 
                 className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                 title={isMuted ? "Ativar Narração" : "Silenciar"}
               >
                   {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-italian-green" />}
               </button>
           </div>
           <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        <p className="text-stone-600 text-sm leading-relaxed">
          {step.description}
        </p>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-stone-100">
           <div className="flex gap-1">
             {STEPS.map((_, idx) => (
               <div 
                 key={idx} 
                 className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-italian-green' : 'w-1.5 bg-stone-200'}`} 
               />
             ))}
           </div>
           
           <div className="flex gap-2">
             {currentStep > 0 && (
               <button 
                 onClick={handlePrev} 
                 className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"
               >
                 <ChevronLeft className="w-5 h-5" />
               </button>
             )}
             <button 
               onClick={handleNext}
               className="px-4 py-2 bg-italian-green text-white text-sm font-bold rounded-lg hover:bg-green-700 flex items-center gap-1"
             >
               {currentStep === STEPS.length - 1 ? 'Concluir' : 'Próximo'}
               {currentStep < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};
