import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Volume2, VolumeX } from 'lucide-react';

interface AdminStep {
  targetId: string;
  title: string;
  pitch: string;
  benefit: string;
  position: 'bottom' | 'top' | 'left' | 'right' | 'center';
  tab?: 'dashboard' | 'orders' | 'menu' | 'settings';
}

const ADMIN_STEPS: AdminStep[] = [
  {
    targetId: 'admin-welcome',
    title: 'Bem-vindo ao Centro de Controle!',
    pitch: 'Aqui você tem o poder de gerenciar toda a sua operação: vendas, cardápio, entregas e a identidade da sua marca.',
    benefit: 'Sua Central de Comando',
    position: 'center',
  },
  {
    targetId: 'admin-tour-dashboard',
    title: 'Seus Lucros, em Tempo Real',
    pitch: 'O Dashboard mostra o faturamento do dia, semana ou mês. Saiba quais produtos são seus campeões de venda com um clique.',
    benefit: 'Decisões Baseadas em Dados',
    position: 'bottom',
    tab: 'dashboard',
  },
  {
    targetId: 'admin-tour-orders',
    title: 'Pedidos Organizados, Cozinha Feliz',
    pitch: 'Receba, aceite, imprima e atualize o status dos pedidos. Menos erros, mais agilidade e clientes satisfeitos.',
    benefit: 'Eficiência Operacional',
    position: 'bottom',
    tab: 'orders',
  },
  {
    targetId: 'admin-tour-menu',
    title: 'Cardápio Vivo, Preços Flexíveis',
    pitch: 'Acabou um ingrediente? Pause o produto. Quer fazer uma promoção relâmpago? Altere o preço em segundos. Simples assim.',
    benefit: 'Controle Total do Menu',
    position: 'bottom',
    tab: 'menu',
  },
  {
    targetId: 'admin-tour-settings',
    title: 'Sua Loja, Suas Regras',
    pitch: 'Defina suas taxas de entrega por CEP ou bairro, configure horários de funcionamento e mude as cores do cardápio para combinar com sua marca.',
    benefit: 'Personalização Completa',
    position: 'bottom',
    tab: 'settings',
  },
    {
    targetId: 'admin-final',
    title: 'Pronto para Vender Mais?',
    pitch: 'Este sistema foi criado para devolver o controle a você, dono do negócio. Chega de taxas, chega de complicação.',
    benefit: 'Sua Independência Digital',
    position: 'center',
  },
];

interface AdminTourProps {
  onClose: () => void;
  setActiveTab: (tab: 'dashboard' | 'orders' | 'menu' | 'coupons' | 'tables' | 'settings') => void;
}

export const AdminTour: React.FC<AdminTourProps> = ({ onClose, setActiveTab }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const speakText = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const updatePosition = () => {
      const step = ADMIN_STEPS[currentStep];
      
      if (step.tab) {
        setActiveTab(step.tab);
      }
      
      if (step.position === 'center') {
        setIsVisible(true);
        setTimeout(() => speakText(`${step.benefit}. ${step.title}. ${step.pitch}`), 500);
        return;
      }
      
      // We need a slight delay for the tab switch to render
      setTimeout(() => {
          const element = document.getElementById(step.targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const rect = element.getBoundingClientRect();
            setPosition({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
            setIsVisible(true);
            setTimeout(() => speakText(`${step.benefit}. ${step.title}. ${step.pitch}`), 500);
          } else {
             console.warn(`Admin tour element not found: ${step.targetId}`);
             handleNext(true); // Skip step if element not found
          }
      }, 200);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.speechSynthesis.cancel();
    };
  }, [currentStep, setActiveTab]);
  
  useEffect(() => {
      if (!isMuted && isVisible) {
          const step = ADMIN_STEPS[currentStep];
          speakText(`${step.benefit}. ${step.title}. ${step.pitch}`);
      } else if (isMuted) {
          window.speechSynthesis.cancel();
      }
  }, [isMuted, isVisible, currentStep]);

  const handleNext = (skip = false) => {
    if (currentStep < ADMIN_STEPS.length - 1) {
      if (!skip) setIsVisible(false);
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsVisible(false);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };
  
  const step = ADMIN_STEPS[currentStep];

  if (step.position === 'center') {
     return (
        <div id={step.targetId} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-italian-red">
              <div className="p-8 text-center space-y-6">
                 <h2 className="text-2xl font-display text-stone-800 mb-2">{step.title}</h2>
                 <p className="text-italian-red font-bold text-sm tracking-wider uppercase">{step.benefit}</p>
                 <p className="text-stone-600 text-lg leading-relaxed">{step.pitch}</p>
                 <div className="flex gap-3 justify-center pt-4">
                    {currentStep > 0 && <button onClick={handlePrev} className="px-6 py-3 rounded-xl border border-stone-200 font-bold text-stone-500 hover:bg-stone-50 transition-colors">Voltar</button>}
                    <button onClick={() => handleNext()} className="flex-1 bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg flex items-center justify-center gap-2">
                       {currentStep === ADMIN_STEPS.length - 1 ? 'Finalizar Tour' : 'Próximo'} <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
     );
  }
  
  if (!isVisible) return null;

  const tooltipWidth = 380;
  const tooltipStyle: React.CSSProperties = { position: 'fixed' };

  if (step.position === 'bottom') {
    tooltipStyle.top = position.top + position.height + 20;
    tooltipStyle.left = Math.max(20, Math.min(position.left + (position.width / 2) - (tooltipWidth / 2), window.innerWidth - tooltipWidth - 20));
  } else if (step.position === 'top') {
    tooltipStyle.top = position.top - 260; // Approx height + margin
    tooltipStyle.left = Math.max(20, Math.min(position.left + (position.width / 2) - (tooltipWidth / 2), window.innerWidth - tooltipWidth - 20));
  }

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen">
      <div 
        className="fixed transition-all duration-500 ease-in-out border-4 border-italian-red rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] z-[101] box-content pointer-events-none"
        style={{ top: position.top - 5, left: position.left - 5, width: position.width + 10, height: position.height + 10, boxShadow: '0 0 0 9999px rgba(0,0,0,0.85), 0 0 30px rgba(200,16,46,0.3)' }}
      />

      <div 
        className="absolute z-[102] bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 flex flex-col"
        style={{ ...tooltipStyle, width: tooltipWidth }}
      >
        <div className="bg-stone-900 p-3 px-4 flex justify-between items-center border-b-2 border-italian-red">
           <span className="text-italian-red text-xs font-bold uppercase tracking-widest">{step.benefit}</span>
           <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="p-1 text-white/50 hover:text-white" title={isMuted ? "Ativar Narração" : "Silenciar"}>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button onClick={handleClose} className="text-white/50 hover:text-white"><X size={16} /></button>
           </div>
        </div>
        <div className="p-5">
           <h3 className="font-display text-xl text-stone-800 mb-3">{step.title}</h3>
           <p className="text-stone-600 text-sm leading-relaxed mb-6">{step.pitch}</p>
           
           <div className="flex items-center justify-between">
              <div className="flex gap-1">
                 {ADMIN_STEPS.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-6 bg-italian-red' : 'w-1.5 bg-stone-200'}`} />
                 ))}
              </div>
              <div className="flex gap-2">
                 <button onClick={handlePrev} disabled={currentStep === 0} className="p-2 text-stone-400 hover:text-stone-900 disabled:opacity-50"><ChevronLeft size={20}/></button>
                 <button onClick={() => handleNext()} className="px-4 py-2 bg-italian-red text-white font-bold rounded-lg hover:bg-red-700 text-sm flex items-center gap-1 shadow-md">
                    {currentStep === ADMIN_STEPS.length - 1 ? 'Finalizar' : 'Próximo'} <ChevronRight size={16}/>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
