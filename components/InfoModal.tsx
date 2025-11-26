import React from 'react';
import { X, MapPin, Phone, MessageCircle, Clock, CreditCard, Truck, Store, ExternalLink } from 'lucide-react';
import { StoreSettings, WeeklySchedule } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  isOpenNow: boolean;
}

const WEEKDAYS_PT = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, settings, isOpenNow }) => {
  if (!isOpen) return null;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;
  
  // Clean phone for link
  const getPhoneLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
  const getWhatsLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

  const paymentMethods = settings.paymentMethods && settings.paymentMethods.length > 0
    ? settings.paymentMethods
    : ['Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="relative h-32 bg-italian-red flex items-center justify-center" style={{ backgroundColor: settings.colors?.primary }}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="text-center text-white p-4">
             <h2 className="font-display text-3xl mb-1">{settings.name}</h2>
             <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isOpenNow ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {isOpenNow ? 'Aberto Agora' : 'Fechado Agora'}
             </span>
          </div>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Section: Contacts */}
          <div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-italian-red" style={{ color: settings.colors?.primary }} /> Canais de Atendimento
            </h3>
            <div className="grid gap-3">
               {/* WhatsApp Principal */}
               <a 
                 href={getWhatsLink(settings.whatsapp)} 
                 target="_blank" 
                 rel="noreferrer"
                 className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors group"
               >
                 <div className="flex items-center gap-3">
                   <div className="bg-green-500 text-white p-2 rounded-full">
                     <MessageCircle className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="font-bold text-green-900">WhatsApp Pedidos</p>
                     <p className="text-sm text-green-700">{settings.whatsapp}</p>
                   </div>
                 </div>
                 <ExternalLink className="w-4 h-4 text-green-600 group-hover:translate-x-1 transition-transform" />
               </a>

               {/* Other Phones */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {settings.phones.map((phone, idx) => (
                   <a 
                     key={idx}
                     href={getPhoneLink(phone)}
                     className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 dark:bg-stone-800 dark:border-stone-700 transition-colors"
                   >
                     <Phone className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                     <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{phone}</span>
                   </a>
                 ))}
               </div>
            </div>
          </div>

          {/* Section: Address & Map */}
          <div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-italian-red" style={{ color: settings.colors?.primary }} /> Localização
            </h3>
            <div className="bg-stone-50 dark:bg-stone-800 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
               <div className="p-4">
                 <p className="text-stone-600 dark:text-stone-300 text-sm mb-4 leading-relaxed">
                   {settings.address}
                 </p>
                 <a 
                   href={mapUrl} 
                   target="_blank" 
                   rel="noreferrer"
                   className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                 >
                   <MapPin className="w-4 h-4" /> Ver no Google Maps
                 </a>
               </div>
            </div>
          </div>

          {/* Section: General Info & Hours */}
          <div className="grid md:grid-cols-1 gap-6">
             <div>
                <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-3 uppercase tracking-wide">
                  <Clock className="w-4 h-4 text-stone-400" /> Horários
                </h3>
                <div className="text-sm text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
                  {settings.schedule ? (
                     <div className="space-y-2">
                        {Object.keys(WEEKDAYS_PT).map((dayKey) => {
                           const daySchedule = settings.schedule![dayKey as keyof WeeklySchedule];
                           const today = new Date().getDay();
                           const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayKey);
                           const isToday = today === dayIndex;

                           return (
                              <div key={dayKey} className={`flex justify-between items-center ${isToday ? 'font-bold text-stone-800 dark:text-white' : ''}`}>
                                 <span className="w-24">{WEEKDAYS_PT[dayKey as keyof typeof WEEKDAYS_PT]}</span>
                                 <div className="text-right">
                                    {daySchedule.isOpen && daySchedule.intervals.length > 0 ? (
                                       daySchedule.intervals.map((int, i) => (
                                          <span key={i} className="block">{int.start} - {int.end}</span>
                                       ))
                                    ) : (
                                       <span className="text-red-500">Fechado</span>
                                    )}
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  ) : (
                     <p>{settings.openingHours}</p>
                  )}
                </div>
             </div>
          </div>

          {/* Section: Payments */}
          <div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 mb-3 uppercase tracking-wide">
               <CreditCard className="w-4 h-4 text-stone-400" /> Formas de Pagamento
            </h3>
            <div className="flex flex-wrap gap-2">
               {paymentMethods.map(method => (
                  <span key={method} className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium rounded-full border border-stone-200 dark:border-stone-700">
                     {method}
                  </span>
               ))}
            </div>
          </div>

        </div>
        
        <div className="p-4 bg-stone-100 dark:bg-stone-800 text-center text-xs text-stone-500">
           © {new Date().getFullYear()} {settings.name}
        </div>

      </div>
    </div>
  );
};