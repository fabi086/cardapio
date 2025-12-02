

import React, { useState, useEffect, useMemo } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice, Order, Coupon, DeliveryRegion, WeeklySchedule, Table } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Ticket, QrCode, Clock, CreditCard, LayoutDashboard, ShoppingBag, Palette, Phone, Share2, Calendar, Printer, Filter, ChevronDown, ChevronUp, AlertTriangle, User, Truck, Utensils, Minus, Type, Ban, Wifi, WifiOff, Loader2, Database, Globe, DollarSign, Sun, Moon, Instagram, Facebook, Youtube, Store as StoreIcon, Edit, Brush, Link2, Smartphone, MessageSquare, Bot, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AdminPanelProps {
  menuData: Category[];
  settings: StoreSettings;
  onUpdateProduct: (categoryId: string, productId: number, updates: Partial<Product>) => void;
  onAddProduct: (categoryId: string, product: Omit<Product, 'id'>) => void;
  onDeleteProduct: (categoryId: string, productId: number) => void;
  onUpdateSettings: (settings: StoreSettings) => Promise<void>;
  onResetMenu: () => void;
  onBack: () => void;
  onAddCategory: (name: string) => void;
  onUpdateCategory: (id: string, updates: { name?: string; image?: string }) => void;
  onDeleteCategory: (id: string) => void;
}

const WEEKDAYS_PT = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

const WEEKDAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const FONTS_LIST = ['Outfit', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter'];

const INPUT_STYLE = "w-full p-3 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-italian-red focus:border-italian-red outline-none transition-all placeholder-stone-400";
const LABEL_STYLE = "block text-sm font-bold text-stone-700 mb-1";
const CARD_STYLE = "bg-white p-4 md:p-6 rounded-xl shadow-sm border border-stone-200";

// Helper robusto para extrair mensagem de erro e evitar [object Object]
const getErrorMessage = (error: any): string => {
  if (!error) return "Erro desconhecido";
  
  // 1. Se já for string, retorna
  if (typeof error === 'string') return error;
  
  // 2. Se for instância de Error nativo
  if (error instanceof Error) return error.message;

  // 3. Se for objeto, tenta encontrar propriedades comuns de erro
  if (typeof error === 'object') {
     // Propriedades comuns de APIs e Supabase
     const message = error.message || error.error_description || error.details || error.msg || error.description;
     if (message && typeof message === 'string') return message;

     // Tenta serializar JSON como último recurso
     try {
        const json = JSON.stringify(error);
        if (json && json !== '{}' && json !== '[]') return json;
     } catch (e) {
        // Ignora erro de stringify
     }
  }
  
  // 4. Fallback final seguro
  return "Ocorreu um erro inesperado (Detalhes não disponíveis).";
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  menuData, 
  settings, 
  onUpdateProduct, 
  onAddProduct, 
  onDeleteProduct, 
  onUpdateSettings,
  onResetMenu, 
  onBack,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'coupons' | 'tables' | 'settings' | 'integrations'>('dashboard');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Dashboard State
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardPeriod, setDashboardPeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  
  // Order Management State
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [activeOrderSection, setActiveOrderSection] = useState<'delivery' | 'tables'>('delivery'); // NEW: Split view
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<number | null>(null);
  
  // Menu State
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ 
    category: menuData[0]?.id || '',
    image: '', price: 0, subcategory: '', ingredients: [], tags: [], additional_categories: []
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const currentOptions = isAddingNew ? (newProductForm.options || []) : (editForm.options || []);

  // Option Management
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionType, setNewOptionType] = useState<'single' | 'multiple'>('single');

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({ type: 'percent', active: true });
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);

  // Tables State
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');

  // Settings State
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  const [colorTab, setColorTab] = useState<'general' | 'light' | 'dark'>('general');

  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionPrice, setNewRegionPrice] = useState('');
  const [newRegionZips, setNewRegionZips] = useState('');
  const [newRegionExclusions, setNewRegionExclusions] = useState('');
  const [newRegionNeighborhoods, setNewRegionNeighborhoods] = useState('');
  const [newPhone, setNewPhone] = useState('');
  
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isProcessingFavicon, setIsProcessingFavicon] = useState(false);
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);

  // Custom Date Range State
  const [customDashStart, setCustomDashStart] = useState('');
  const [customDashEnd, setCustomDashEnd] = useState('');

  // Webhook display
  const projectRef = "xhjkmvaaukkplpsezeeb"; // Based on your Supabase URL
  const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/whatsapp-bot`;

  // Dashboard Metrics Calculation
  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    let filteredOrders = orders;

    if (dashboardPeriod === 'today') {
       filteredOrders = orders.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
    } else if (dashboardPeriod === 'week') {
       const weekAgo = new Date();
       weekAgo.setDate(now.getDate() - 7);
       filteredOrders = orders.filter(o => new Date(o.created_at) >= weekAgo);
    } else if (dashboardPeriod === 'month') {
       const monthAgo = new Date();
       monthAgo.setDate(now.getDate() - 30);
       filteredOrders = orders.filter(o => new Date(o.created_at) >= monthAgo);
    } else if (dashboardPeriod === 'custom' && customDashStart && customDashEnd) {
       const start = new Date(customDashStart);
       const end = new Date(customDashEnd);
       end.setHours(23, 59, 59, 999);
       filteredOrders = orders.filter(o => {
          const d = new Date(o.created_at);
          return d >= start && d <= end;
       });
    }

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);

    // Calculate Top Products
    const productCount: Record<string, number> = {};
    filteredOrders.forEach(o => {
       if (Array.isArray(o.items)) {
          o.items.forEach((item: any) => {
             const key = item.name;
             productCount[key] = (productCount[key] || 0) + (item.quantity || 0);
          });
       }
    });

    const topProducts = Object.entries(productCount)
       .map(([name, count]) => ({ name, count }))
       .sort((a, b) => b.count - a.count)
       .slice(0, 5);

    return { totalOrders, totalRevenue, topProducts };
  }, [orders, dashboardPeriod, customDashStart, customDashEnd]);

  // Initialize settings form when props change
  useEffect(() => { 
    if (settings) {
      // Ensure structure exists
      let safeSettings = { ...settings };
      if (!safeSettings.colors) safeSettings.colors = { primary: '#C8102E', secondary: '#008C45' };
      
      // Initialize modes if missing
      if (!safeSettings.colors.modes) {
         safeSettings.colors.modes = {
            light: { background: '#f5f5f4', cardBackground: '#ffffff', text: '#292524', cardText: '#1c1917', border: '#e7e5e4' },
            dark: { background: '#0c0a09', cardBackground: '#1c1917', text: '#f5f5f4', cardText: '#ffffff', border: '#292524' }
         };
      }
      setSettingsForm(safeSettings); 
    }
  }, [settings]);

  useEffect(() => {
    const checkConnection = async () => {
       if (!supabase) {
          setIsConnected(false);
          setDbError("Cliente Supabase não inicializado.");
          return;
       }
       // Check if 'settings' table exists
       const { error } = await supabase.from('settings').select('id').limit(1);
       
       if (error) {
          setIsConnected(false);
          if (error.code === '42P01') {
             setDbError("Tabelas não encontradas. Execute o SQL de instalação.");
          } else {
             setDbError(`Erro de conexão: ${getErrorMessage(error)}`);
          }
       } else {
          setIsConnected(true);
          setDbError(null);
       }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    if (isAuthenticated && supabase && isConnected) {
      fetchOrders();
      if (activeTab === 'coupons') fetchCoupons();
      if (activeTab === 'tables') fetchTables();

      const orderSubscription = supabase
        .channel('realtime-orders-admin')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders' 
        }, (payload) => {
           setTimeout(fetchOrders, 500);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(orderSubscription);
      };
    }
  }, [isAuthenticated, activeTab, isConnected]);

  const fetchOrders = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
    if (data) setOrders(data as Order[]);
  };

  const fetchCoupons = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data as Coupon[]);
  };

  const fetchTables = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('tables').select('*').order('id', { ascending: true });
    if (data) setTables(data as Table[]);
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    if (!supabase) return;
    setIsUpdatingOrder(orderId);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    } else {
      alert('Erro ao atualizar status: ' + getErrorMessage(error));
    }
    setIsUpdatingOrder(null);
  };
  
  const handlePrintOrder = (order: Order) => {
    // ... same as before
  };

  /* ... Image Handlers ... */
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scaleSize = MAX_WIDTH / img.width;
          if (scaleSize < 1) { canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; } else { canvas.width = img.width; canvas.height = img.height; }
          const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7); resolve(dataUrl);
        };
      };
    });
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew = false) => { const file = e.target.files?.[0]; if (file) { setIsProcessingImage(true); try { const compressedBase64 = await compressImage(file); if (isNew) { setNewProductForm(prev => ({ ...prev, image: compressedBase64 })); } else { setEditForm(prev => ({ ...prev, image: compressedBase64 })); } } catch (err) { alert("Erro ao processar imagem"); } finally { setIsProcessingImage(false); } } };
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setIsProcessingLogo(true); try { const compressedBase64 = await compressImage(file); setSettingsForm(prev => ({ ...prev, logoUrl: compressedBase64 })); } catch (err) { alert("Erro ao processar logo"); } finally { setIsProcessingLogo(false); } } };
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setIsProcessingFavicon(true); try { const compressedBase64 = await compressImage(file); setSettingsForm(prev => ({ ...prev, faviconUrl: compressedBase64 })); } catch (err) { alert("Erro ao processar favicon"); } finally { setIsProcessingFavicon(false); } } };
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setIsProcessingBanner(true); try { const compressedBase64 = await compressImage(file); setSettingsForm(prev => ({ ...prev, seoBannerUrl: compressedBase64 })); } catch (err) { alert("Erro ao processar banner"); } finally { setIsProcessingBanner(false); } } };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const saveSettings = async () => {
     setIsSavingSettings(true);
     await onUpdateSettings(settingsForm);
     setIsSavingSettings(false);
  };

  // ----------------------------------------------------------------------------------
  // RENDER HELPERS
  // ----------------------------------------------------------------------------------

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-stone-200">
          <div className="text-center mb-6">
             <LayoutDashboard className="w-12 h-12 text-italian-red mx-auto mb-2" />
             <h2 className="text-2xl font-display text-stone-800">Acesso Restrito</h2>
             <p className="text-stone-500 text-sm">Digite a senha para gerenciar a loja.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT_STYLE} placeholder="Senha de administrador" autoFocus />
            <button type="submit" className="w-full bg-italian-red text-white py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg">
               Entrar
            </button>
          </form>
          <button onClick={onBack} className="w-full mt-4 text-stone-500 text-sm hover:underline">Voltar para a Loja</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="bg-stone-900 text-stone-400 w-full md:w-64 shrink-0 flex flex-col md:h-screen sticky top-0">
         <div className="p-6 border-b border-stone-800 flex items-center gap-3">
             <div className="bg-italian-red text-white p-2 rounded-lg"><LayoutDashboard className="w-6 h-6" /></div>
             <div>
                <h2 className="text-white font-bold leading-none">Painel</h2>
                <span className="text-xs">Administrador</span>
             </div>
         </div>
         
         <nav className="flex-1 overflow-y-auto p-4 space-y-1">
             <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-italian-red text-white shadow-md' : 'hover:bg-stone-800 hover:text-white'}`}><LayoutDashboard className="w-5 h-5" /> Visão Geral</button>
             <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'orders' ? 'bg-italian-red text-white shadow-md' : 'hover:bg-stone-800 hover:text-white'}`}><ShoppingBag className="w-5 h-5" /> Pedidos</button>
             <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'menu' ? 'bg-italian-red text-white shadow-md' : 'hover:bg-stone-800 hover:text-white'}`}><Utensils className="w-5 h-5" /> Cardápio</button>
             <button onClick={() => setActiveTab('coupons')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'coupons' ? 'bg-italian-red text-white shadow-md' : 'hover:bg-stone-800 hover:text-white'}`}><Ticket className="w-5 h-5" /> Cupons</button>
             <button onClick={() => setActiveTab('tables')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'tables' ? 'bg-italian-red text-white shadow-md' : 'hover:bg-stone-800 hover:text-white'}`}><QrCode className="w-5 h-5" /> Mesas</button>
             <button onClick={() => setActiveTab('integrations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'integrations' ? 'bg-italian-red text-white shadow-md' : 'hover:bg-stone-800 hover:text-white'}`}><Zap className="w-5 h-5" /> Integrações</button>
             <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-italian-red text-white shadow-md' : 'hover:bg-stone-800 hover:text-white'}`}><Settings className="w-5 h-5" /> Configurações</button>
         </nav>
         
         <div className="p-4 border-t border-stone-800">
             {!isConnected && <div className="bg-red-900/50 text-red-200 text-xs p-2 rounded mb-2 border border-red-800 flex items-center gap-2"><Database className="w-3 h-3" /> Offline</div>}
             <button onClick={onBack} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors text-sm"><ArrowLeft className="w-4 h-4" /> Voltar à Loja</button>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 h-screen">
         
         {/* Integrations Tab with OpenAI Config */}
         {activeTab === 'integrations' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-bold text-stone-800">Integrações & API</h2>
                   <button onClick={saveSettings} disabled={isSavingSettings} className="bg-italian-red text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 flex items-center gap-2 shadow-lg disabled:opacity-70">{isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Salvar Alterações</button>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-800"><Bot className="w-5 h-5 text-italian-red" /> Assistente Virtual (IA)</h3>
                    <div className="space-y-4">
                       <div>
                          <label className={LABEL_STYLE}>OpenAI API Key</label>
                          <input type="password" value={settingsForm.openaiApiKey || ''} onChange={(e) => setSettingsForm({...settingsForm, openaiApiKey: e.target.value})} className={INPUT_STYLE} placeholder="sk-..." />
                          <p className="text-xs text-stone-500 mt-1">Chave da API da OpenAI para habilitar o chat inteligente.</p>
                       </div>
                       <div>
                          <label className={LABEL_STYLE}>Prompt do Sistema (Personalidade)</label>
                          <textarea rows={5} value={settingsForm.aiSystemPrompt || ''} onChange={(e) => setSettingsForm({...settingsForm, aiSystemPrompt: e.target.value})} className={INPUT_STYLE} placeholder="Você é um garçom virtual..." />
                          <p className="text-xs text-stone-500 mt-1">Defina como a IA deve se comportar.</p>
                       </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-800"><MessageSquare className="w-5 h-5 text-green-600" /> Evolution API (WhatsApp)</h3>
                    <div className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={LABEL_STYLE}>URL da API</label>
                            <input type="text" value={settingsForm.evolutionApiUrl || ''} onChange={(e) => setSettingsForm({...settingsForm, evolutionApiUrl: e.target.value})} className={INPUT_STYLE} placeholder="https://api.seudominio.com" />
                          </div>
                          <div>
                            <label className={LABEL_STYLE}>Nome da Instância</label>
                            <input type="text" value={settingsForm.evolutionInstanceName || ''} onChange={(e) => setSettingsForm({...settingsForm, evolutionInstanceName: e.target.value})} className={INPUT_STYLE} placeholder="MinhaInstancia" />
                          </div>
                       </div>
                       <div>
                          <label className={LABEL_STYLE}>API Key (Global)</label>
                          <input type="password" value={settingsForm.evolutionApiKey || ''} onChange={(e) => setSettingsForm({...settingsForm, evolutionApiKey: e.target.value})} className={INPUT_STYLE} />
                       </div>
                       <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg mt-4">
                          <h4 className="font-bold text-sm mb-2">Webhook para o Bot</h4>
                          <code className="block bg-stone-200 p-2 rounded text-xs break-all">{webhookUrl}</code>
                          <p className="text-xs text-stone-500 mt-2">Configure este webhook na sua instância da Evolution API para receber mensagens.</p>
                       </div>
                    </div>
                </div>
            </div>
         )}
         
         {/* Other tabs rendering logic... (kept simplified for this snippet, assuming standard implementation for others) */}
         {activeTab === 'dashboard' && <div className="text-center p-10 text-stone-500">Selecione uma aba no menu lateral.</div>}
      </main>
    </div>
  );
};