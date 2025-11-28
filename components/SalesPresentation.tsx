import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, TrendingUp, DollarSign, Zap, Smartphone, CheckCircle, Crown, Lock, Volume2, VolumeX } from 'lucide-react';

interface SalesStep {
  targetId: string;
  title: string;
  pitch: string;
  benefit: string; // The "Why buy" text
  position: 'bottom' | 'top' | 'left' | 'right' | 'center';
  icon?: React.ElementType;
  useLogo?: boolean;
}

const SALES_STEPS: SalesStep[] = [
  {
    targetId: 'welcome-modal',
    title: 'Sistema de Vendas Profissional',
    pitch: 'Transforme o atendimento da sua pizzaria e elimine taxas de marketplaces.',
    benefit: 'Apresentação da Solução',
    position: 'center',
    icon: Crown
  },
  {
    targetId: 'tour-logo-area',
    title: 'Sua Marca em 1º Lugar',
    pitch: 'Diferente do iFood, aqui o destaque é 100% da sua marca. Cores, logo e identidade visual personalizáveis.',
    benefit: 'Fidelização de Clientes',
    position: 'bottom',
    icon:  CheckCircle,
    useLogo: true
  },
  {
    targetId: 'tour-search',
    title: 'Busca Instantânea = Menos Desistência',
    pitch: 'Seu cliente encontra o que quer em milissegundos. Filtros por "Vegetariano" ou "Mais Pedidos" aceleram a decisão de compra.',
    benefit: 'Experiência de Usuário (UX)',
    position: 'bottom',
    icon: Zap
  },
  {
    targetId: 'tour-product-card',
    title: 'Cardápio que Vende Sozinho',
    pitch: 'Fotos grandes e apetitosas. O sistema de "Adicionais" e "Bordas" incentiva o cliente a gastar mais em cada item.',
    benefit: 'Aumento do Ticket Médio',
    position: 'top',
    icon: TrendingUp
  },
  {
    targetId: 'category-pizzas-salgadas', // Targetting the pizza section usually
    title: 'Montagem de Pizza Inteligente',
    pitch: 'Resolvemos a dor de cabeça do "Meia a Meia". O sistema calcula o preço correto automaticamente e permite observações detalhadas.',
    benefit: 'Sem Erros na Cozinha',
    position: 'top',
    icon: Smartphone
  },
  {
    targetId: 'tour-cart',
    title: 'Upsell Automático',
    pitch: 'O carrinho sugere bebidas e sobremesas antes de fechar. É como ter um garçom treinado oferecendo "algo mais" em todo pedido.',
    benefit: 'Venda Cruzada',
    position: 'top',
    icon: DollarSign
  },
  {
    targetId: 'checkout-demo', // Conceptual target
    title: 'Pedido Limpo no WhatsApp',
    pitch: 'Chega de áudios confusos. O pedido chega formatado, somado e com endereço validado direto no seu WhatsApp ou impressora térmica.',
    benefit: 'Agilidade Operacional',
    position: 'center',
    icon: CheckCircle
  },
  {
    targetId: 'admin-button-demo',
    title: 'Gestão Completa na Nuvem',
    pitch: 'Edite preços, pause produtos, veja relatórios e feche a loja com um clique. Tudo pelo celular, de onde você estiver.',
    benefit: 'Controle Total',
    position: 'top',
    icon: Lock
  }
];

interface SalesPresentationProps {
  onClose: () => void;
  logoUrl?: string;
  onFinish?: () => void;
}

export const SalesPresentation: React.FC<SalesPresentationProps> = ({ onClose, logoUrl, onFinish }) => {
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
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR'));
    if (ptVoice) utterance.voice = ptVoice;
    window.speechSynthesis.speak(utterance);
  };
  
  useEffect(() => {
    if (currentStep === 0) window.scrollTo({ top: 0, behavior: 'smooth' });

    const updatePosition = () => {
      const step = SALES_STEPS[currentStep];
      if (step.position === 'center') {
        setIsVisible(true);
        setTimeout(() => speakText(`${step.benefit}. ${step.title}. ${step.pitch}`), 800);
        return;
      }
      let element = document.getElementById(step.targetId);
      if (!element && step.targetId === 'category-pizzas-salgadas') {
         element = document.querySelector('section[id^="category-"] h2');
      }

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = element.getBoundingClientRect();
        setPosition({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height });
        setIsVisible(true);
        setTimeout(() => speakText(`${step.benefit}. ${step.title}. ${step.pitch}`), 800);
      } else {
         console.warn(`Sales element not found: ${step.targetId}`);
      }
    };

    const timer = setTimeout(updatePosition, 500);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.speechSynthesis.cancel();
    };
  }, [currentStep]);
  
  useEffect(() => {
      if (!isMuted && isVisible) {
          const step = SALES_STEPS[currentStep];
          speakText(`${step.benefit}. ${step.title}. ${step.pitch}`);
      } else if (isMuted) {
          window.speechSynthesis.cancel();
      }
  }, [isMuted, isVisible, currentStep]);

  const handleNext = () => {
    if (currentStep < SALES_STEPS.length - 1) {
      setIsVisible(false);
      setCurrentStep(prev => prev + 1);
    } else {
      if (onFinish) {
        onFinish();
      } else {
        handleClose();
      }
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

  const step = SALES_STEPS[currentStep];
  const Icon = step.icon || Crown;
  
  if (step.position === 'center') {
     return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-[#FFD700]">
              <div className="bg-stone-900 p-6 text-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-tr from-stone-900 via-stone-800 to-stone-900"></div>
                 <div className="absolute -right-10 -top-10 text-[#FFD700] opacity-10"><Crown size={150} /></div>
                 <div className="relative z-10">
                    <div className="w-16 h-16 bg-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-4 text-stone-900 shadow-[0_0_20px_rgba(255,215,0,0.5)]">
                       <Icon size={32} />
                    </div>
                    <h2 className="text-2xl font-display text-white mb-2">{step.title}</h2>
                    <p className="text-[#FFD700] font-bold text-sm tracking-wider uppercase">{step.benefit}</p>
                 </div>
              </div>
              <div className="p-8 text-center space-y-6">
                 <p className="text-stone-600 text-lg leading-relaxed">{step.pitch}</p>
                 <div className="flex gap-3 justify-center">
                    {currentStep > 0 && <button onClick={handlePrev} className="px-6 py-3 rounded-xl border border-stone-200 font-bold text-stone-500 hover:bg-stone-50 transition-colors">Voltar</button>}
                    <button onClick={handleNext} className="flex-1 bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg flex items-center justify-center gap-2">
                       {currentStep === 0 ? 'Iniciar Apresentação' : currentStep === SALES_STEPS.length - 1 ? 'Ver o Painel' : 'Próximo'} <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
     );
  }

  if (!isVisible) return null;
  
  const isMobile = window.innerWidth < 768;
  const tooltipWidth = isMobile ? window.innerWidth - 40 : 380;
  const tooltipStyle: React.CSSProperties = { position: 'absolute' };

  if (step.position === 'bottom') {
    tooltipStyle.top = position.top + position.height + 20;
    tooltipStyle.left = isMobile ? 20 : Math.max(20, Math.min(position.left + (position.width / 2) - (tooltipWidth / 2), window.innerWidth - tooltipWidth - 20));
  } else if (step.position === 'top') {
    tooltipStyle.top = position.top - 260; // Approx height + margin
    tooltipStyle.left = isMobile ? 20 : Math.max(20, Math.min(position.left + (position.width / 2) - (tooltipWidth / 2), window.innerWidth - tooltipWidth - 20));
  }

  return (
    <div className="absolute inset-0 z-[100] h-full w-full">
      <div 
        className="absolute transition-all duration-500 ease-in-out border-4 border-[#FFD700] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] z-[101] box-content pointer-events-none"
        style={{ top: position.top - 5, left: position.left - 5, width: position.width + 10, height: position.height + 10, boxShadow: '0 0 0 9999px rgba(0,0,0,0.85), 0 0 30px rgba(255,215,0,0.3)' }}
      >
         <div className="absolute -top-3 -right-3 bg-[#FFD700] text-stone-900 p-1.5 rounded-full shadow-lg animate-bounce overflow-hidden flex items-center justify-center w-8 h-8">
            {step.useLogo && logoUrl ? (
                <img src={logoUrl} alt="Logo da Loja" className="w-full h-full object-contain p-0.5" />
            ) : (
                <Icon size={20} />
            )}
         </div>
      </div>

      <div 
        className="absolute z-[102] bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 flex flex-col"
        style={{ ...tooltipStyle, width: tooltipWidth }}
      >
        <div className="bg-stone-900 p-3 px-4 flex justify-between items-center border-b-2 border-[#FFD700]">
           <span className="text-[#FFD700] text-xs font-bold uppercase tracking-widest">{step.benefit}</span>
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
                 {SALES_STEPS.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-6 bg-[#FFD700]' : 'w-1.5 bg-stone-200'}`} />
                 ))}
              </div>
              <div className="flex gap-2">
                 <button onClick={handlePrev} disabled={currentStep === 0} className="p-2 text-stone-400 hover:text-stone-900 disabled:opacity-50"><ChevronLeft size={20}/></button>
                 <button onClick={handleNext} className="px-4 py-2 bg-[#FFD700] text-stone-900 font-bold rounded-lg hover:bg-yellow-400 text-sm flex items-center gap-1 shadow-md">
                    {currentStep === SALES_STEPS.length - 1 ? 'Ver o Painel' : 'Próximo'} <ChevronRight size={16}/>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};