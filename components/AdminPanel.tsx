
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
     
     // OpenAI error structure (error.error pode ser string ou objeto)
     if (error.error) {
         if (typeof error.error === 'string') return error.error;
         if (typeof error.error === 'object' && error.error.message) return String(error.error.message);
     }

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
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);

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
    const win = window.open('', '_blank');
    if (!win) return;
    const itemsHtml = order.items.map((item: any) => `
        <div class="item-row">
            <div class="qty">${item.quantity}x</div>
            <div class="name">
                ${item.name}
                ${item.selectedOptions?.map((opt: any) => `
                    <div class="option">+ ${opt.choiceName}</div>
                `).join('') || ''}
                ${item.observation ? `<div class="obs">OBS: ${item.observation}</div>` : ''}
            </div>
            <div class="price">${settings.currencySymbol} ${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');

    const receiptHtml = `
        <html>
        <head>
            <title>Pedido #${order.id}</title>
            <style>
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { margin: 0; padding: 5px; }
                }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    line-height: 1.2;
                    color: #000;
                    width: 100%;
                    max-width: 80mm; 
                    margin: 0 auto;
                    padding: 10px;
                    background: #fff;
                }
                .header { text-align: center; margin-bottom: 10px; }
                .title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
                .subtitle { font-size: 12px; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; width: 100%; }
                .info-row { margin-bottom: 4px; }
                .bold { font-weight: bold; }
                .big { font-size: 14px; }
                .item-row { display: flex; align-items: flex-start; margin-bottom: 6px; }
                .qty { font-weight: bold; width: 25px; flex-shrink: 0; }
                .name { flex-grow: 1; word-break: break-word; }
                .price { font-weight: bold; margin-left: 5px; white-space: nowrap; }
                .option { font-size: 11px; margin-left: 0px; color: #333; display: block; }
                .obs { font-weight: bold; font-size: 11px; margin-top: 2px; text-transform: uppercase; }
                .summary { margin-top: 10px; }
                .flex-between { display: flex; justify-content: space-between; }
                .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">${settings.name}</div>
                <div class="subtitle">${new Date(order.created_at).toLocaleString('pt-BR')}</div>
                <div class="subtitle bold" style="margin-top:5px;">PEDIDO #${order.id}</div>
            </div>
            <div class="divider"></div>
            <div class="info-row"><span class="bold">CLIENTE:</span> ${order.customer_name}</div>
            <div class="info-row"><span class="bold">TIPO:</span> ${order.delivery_type === 'delivery' ? 'ENTREGA' : order.delivery_type === 'table' ? 'MESA' : 'RETIRADA'}</div>
            ${order.delivery_type === 'delivery' ? `
                <div class="info-row"><span class="bold">ENDEREÇO:</span></div>
                <div>${order.address_street}, ${order.address_number}</div>
                <div>${order.address_district}</div>
                ${order.address_complement ? `<div>Comp: ${order.address_complement}</div>` : ''}
                ${order.address_city ? `<div>${order.address_city}</div>` : ''}
            ` : order.delivery_type === 'table' ? `
                <div class="info-row big bold" style="margin-top:5px;">MESA: ${order.table_number}</div>
            ` : ''}
            <div class="divider"></div>
            <div>${itemsHtml}</div>
            <div class="divider"></div>
            <div class="summary">
                <div class="flex-between"><span>Subtotal:</span> <span>${settings.currencySymbol} ${(order.total - (order.delivery_fee||0) + (order.discount||0)).toFixed(2)}</span></div>
                ${order.delivery_fee > 0 ? `<div class="flex-between"><span>Taxa Entrega:</span> <span>${settings.currencySymbol} ${order.delivery_fee.toFixed(2)}</span></div>` : ''}
                ${order.discount > 0 ? `<div class="flex-between"><span>Desconto:</span> <span>-${settings.currencySymbol} ${order.discount.toFixed(2)}</span></div>` : ''}
                <div class="flex-between big bold" style="margin-top:5px;"><span>TOTAL:</span> <span>${settings.currencySymbol} ${order.total.toFixed(2)}</span></div>
            </div>
            <div class="divider"></div>
            <div class="info-row"><span class="bold">PAGAMENTO:</span> ${order.payment_method}</div>
            ${order.observation ? `<div class="info-row" style="margin-top:5px;"><span class="bold">OBS GERAL:</span> ${order.observation}</div>` : ''}
            <div class="footer">Sistema de Pedidos Digital<br/>Obrigado pela preferência!</div>
            <script>window.onload = () => { window.print(); }</script>
        </body>
        </html>
    `;
    win.document.write(receiptHtml);
    win.document.close();
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

  /* ... CRUD Handlers ... */
  const startEditing = (product: Product) => { setEditingProduct(product.id); setEditForm({ ...product, additional_categories: product.additional_categories || [] }); };
  const saveEdit = () => { if (editingProduct && editForm) { const catId = editForm.category_id || menuData.find(c => c.items.find(p => p.id === editingProduct))?.id || ''; onUpdateProduct(catId, editingProduct, editForm); setEditingProduct(null); setEditForm({}); } };
  const handleAddNewProduct = () => { if (!newProductForm.name || !newProductForm.price || !newProductForm.category) { alert('Preencha nome, preço e categoria principal'); return; } const productToAdd = { name: newProductForm.name!, description: newProductForm.description || '', price: Number(newProductForm.price), image: newProductForm.image || '', category: newProductForm.category!, subcategory: newProductForm.subcategory || '', code: newProductForm.code || '', options: newProductForm.options || [], ingredients: newProductForm.ingredients || [], tags: newProductForm.tags || [], additional_categories: newProductForm.additional_categories || [] }; onAddProduct(newProductForm.category!, productToAdd); setIsAddingNew(false); setNewProductForm({ category: menuData[0]?.id || '', image: '', price: 0, subcategory: '', ingredients: [], tags: [], additional_categories: [] }); };
  const toggleAdditionalCategory = (catId: string, isNew: boolean) => { if (isNew) { const current = newProductForm.additional_categories || []; if (current.includes(catId)) { setNewProductForm({...newProductForm, additional_categories: current.filter(c => c !== catId)}); } else { setNewProductForm({...newProductForm, additional_categories: [...current, catId]}); } } else { const current = editForm.additional_categories || []; if (current.includes(catId)) { setEditForm({...editForm, additional_categories: current.filter(c => c !== catId)}); } else { setEditForm({...editForm, additional_categories: [...current, catId]}); } } };
  const addOptionToForm = (isNew: boolean) => { if (!newOptionName) return; const newOption: ProductOption = { id: Date.now().toString(), name: newOptionName, type: newOptionType, required: false, choices: [] }; if (isNew) { setNewProductForm(prev => ({ ...prev, options: [...(prev.options || []), newOption] })); } else { setEditForm(prev => ({ ...prev, options: [...(prev.options || []), newOption] })); } setNewOptionName(''); };
  const removeOptionFromForm = (optionId: string, isNew: boolean) => { if(isNew) { setNewProductForm(prev => ({ ...prev, options: (prev.options || []).filter(o => o.id !== optionId) })); } else { setEditForm(prev => ({ ...prev, options: (prev.options || []).filter(o => o.id !== optionId) })); } };
  const addChoiceToOption = (optionId: string, choiceName: string, choicePrice: string, isNew: boolean) => { if (!choiceName) return; const choice: ProductChoice = { name: choiceName, price: Number(choicePrice) }; const updateOptions = (options: ProductOption[] = []) => { return options.map(opt => { if (opt.id === optionId) { return { ...opt, choices: [...opt.choices, choice] }; } return opt; }); }; if (isNew) { setNewProductForm(prev => ({ ...prev, options: updateOptions(prev.options) })); } else { setEditForm(prev => ({ ...prev, options: updateOptions(prev.options) })); } };
  const removeChoiceFromOption = (optionId: string, choiceIndex: number, isNew: boolean) => { const updateOptions = (options: ProductOption[] = []) => { return options.map(opt => { if(opt.id === optionId) { return { ...opt, choices: opt.choices.filter((_, idx) => idx !== choiceIndex) }; } return opt; }); }; if(isNew) setNewProductForm(prev => ({ ...prev, options: updateOptions(prev.options) })); else setEditForm(prev => ({ ...prev, options: updateOptions(prev.options) })); };
  
  const handleSaveSettings = async () => { 
      setIsSavingSettings(true);
      try {
          await onUpdateSettings(settingsForm); 
          alert('Configurações salvas com sucesso!'); 
      } catch (e: any) {
          console.error("Erro original:", e);
          const msg = getErrorMessage(e);
          alert(`Erro ao salvar: ${msg}`);
      } finally {
          setIsSavingSettings(false);
      }
  };
  
  const handleAddRegion = () => { if (!newRegionName || !newRegionPrice) return; let neighborhoodsList: string[] = []; if (newRegionNeighborhoods.trim()) { neighborhoodsList = newRegionNeighborhoods.split(',').map(s => s.trim()).filter(s => s); } else { neighborhoodsList = [newRegionName.trim()]; } const newRegion: DeliveryRegion = { id: Date.now().toString(), name: newRegionName, price: Number(newRegionPrice), zipRules: newRegionZips.split(',').map(s => s.trim()).filter(s => s), zipExclusions: newRegionExclusions.split(',').map(s => s.trim()).filter(s => s), neighborhoods: neighborhoodsList }; const updatedRegions = [...(settingsForm.deliveryRegions || []), newRegion]; setSettingsForm({ ...settingsForm, deliveryRegions: updatedRegions }); setNewRegionName(''); setNewRegionPrice(''); setNewRegionZips(''); setNewRegionExclusions(''); setNewRegionNeighborhoods(''); };
  const handleRemoveRegion = (id: string) => { const updatedRegions = settingsForm.deliveryRegions?.filter(r => r.id !== id) || []; setSettingsForm({ ...settingsForm, deliveryRegions: updatedRegions }); };
  const handleAddPhone = () => { if(newPhone) { setSettingsForm({...settingsForm, phones: [...settingsForm.phones, newPhone]}); setNewPhone(''); } };
  const handleRemovePhone = (idx: number) => { setSettingsForm({...settingsForm, phones: settingsForm.phones.filter((_, i) => i !== idx)}); };

  const handleScheduleUpdate = (day: string, field: 'isOpen' | 'start' | 'end', value: any) => {
    setSettingsForm(prev => {
        const currentSchedule = prev.schedule || {} as WeeklySchedule;
        const daySchedule = currentSchedule[day as keyof WeeklySchedule] || { isOpen: false, intervals: [] };
        let newDaySchedule = { ...daySchedule };
        if (field === 'isOpen') {
            newDaySchedule.isOpen = value;
            if (value && (!newDaySchedule.intervals || newDaySchedule.intervals.length === 0)) {
                newDaySchedule.intervals = [{ start: '18:00', end: '23:00' }];
            }
        } else {
            const currentIntervals = [...(newDaySchedule.intervals || [])];
            if (currentIntervals.length === 0) currentIntervals.push({ start: '18:00', end: '23:00' });
            const firstInterval = { ...currentIntervals[0], [field]: value };
            currentIntervals[0] = firstInterval;
            newDaySchedule.intervals = currentIntervals;
        }
        return { ...prev, schedule: { ...currentSchedule, [day]: newDaySchedule } };
    });
  };
  
  const handleEditCoupon = (coupon: Coupon) => { 
      setEditingCouponId(coupon.id); 
      setCouponForm({ 
          code: coupon.code, 
          type: coupon.type, 
          discount_value: coupon.discount_value, 
          min_order_value: coupon.min_order_value, 
          end_date: coupon.end_date ? new Date(coupon.end_date).toISOString().split('T')[0] : '', 
          active: coupon.active 
      }); 
      setIsAddingCoupon(true); 
  };
  
  const cancelEditCoupon = () => { setEditingCouponId(null); setCouponForm({ type: 'percent', active: true }); setIsAddingCoupon(false); };
  
  const handleSaveCoupon = async () => { 
      if (!couponForm.code || !couponForm.discount_value) return; 
      
      try {
          if (supabase) { 
              const payload: any = { ...couponForm, code: couponForm.code.toUpperCase().trim(), discount_value: Number(couponForm.discount_value) }; 
              if (!payload.min_order_value) payload.min_order_value = 0; 
              
              if (editingCouponId) { 
                  const { error } = await supabase.from('coupons').update(payload).eq('id', editingCouponId); 
                  if(error) throw error;
                  cancelEditCoupon(); 
                  fetchCoupons(); 
              } else { 
                  const { error } = await supabase.from('coupons').insert([payload]); 
                  if(error) throw error;
                  setIsAddingCoupon(false); 
                  fetchCoupons(); 
              } 
          } 
      } catch (e: any) {
          alert("Erro ao salvar cupom: " + getErrorMessage(e));
      }
  };
  
  const handleDeleteCoupon = async (id: number) => { 
      if (window.confirm('Excluir cupom?')) { 
          try {
             if (supabase) { 
                 const { error } = await supabase.from('coupons').delete().eq('id', id); 
                 if(error) throw error;
                 fetchCoupons(); 
             } 
          } catch(e) {
             alert("Erro ao excluir: " + getErrorMessage(e));
          }
      } 
  };
  
  const handleAddTable = async () => { 
      if (!newTableNumber) return; 
      try {
         if (supabase) { 
             const { error } = await supabase.from('tables').insert([{ number: newTableNumber, active: true }]); 
             if(!error) { 
                 setNewTableNumber(''); 
                 fetchTables(); 
             } else {
                 throw error;
             }
         } 
      } catch(e) {
         alert("Erro ao adicionar mesa: " + getErrorMessage(e));
      }
  };
  
  const handleDeleteTable = async (id: number) => { 
    if (!window.confirm('Tem certeza que deseja remover esta mesa?')) return;
    
    if (supabase) { 
        const { error } = await supabase.from('tables').delete().eq('id', id);
        
        if (error) {
            console.error("Erro ao excluir mesa:", error);
            alert(`Erro ao excluir mesa: ${getErrorMessage(error)}`);
        } else {
            // Success
            fetchTables(); 
        }
    } 
  };

  const handleTestOpenAI = async () => {
    setIsTestingOpenAI(true);
    try {
        const apiKey = settingsForm.openaiApiKey;
        if (!apiKey) throw new Error("Insira uma chave API para testar.");
        
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        if (response.ok) {
            alert("Conexão com OpenAI bem sucedida!");
        } else {
            // Tenta obter o corpo do erro
            let err;
            try {
               err = await response.json();
            } catch {
               err = { message: `Erro HTTP ${response.status}` };
            }
            const msg = getErrorMessage(err);
            throw new Error(msg);
        }
    } catch (e: any) {
        const errMsg = getErrorMessage(e);
        alert("Erro no teste: " + errMsg);
    } finally {
        setIsTestingOpenAI(false);
    }
  };

  const getQrCodeUrl = (tableNum: string) => { 
      const baseUrl = window.location.origin + window.location.pathname;
      const finalUrl = `${baseUrl.split('?')[0]}?mesa=${tableNum}`;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      return {
        qr: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalUrl)}`,
        link: finalUrl,
        isLocalhost
      }; 
  };

  const printQrCode = (tableNum: string) => { 
      const { qr: qrUrl, link: textUrl, isLocalhost } = getQrCodeUrl(tableNum); 
      const win = window.open('', '_blank'); 
      if (win) { 
          win.document.write(`
            <html>
                <head>
                    <title>Mesa ${tableNum} - QR Code</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&display=swap');
                        body { margin: 0; padding: 0; font-family: 'Outfit', sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
                        .card { width: 100%; max-width: 350px; height: 500px; border: 2px solid #000; padding: 20px; text-align: center; background: white; position: relative; display: flex; flex-direction: column; justify-content: space-between; border-radius: 10px; box-sizing: border-box; }
                        .logo { height: 60px; object-fit: contain; margin: 0 auto; }
                        .title { font-size: 24px; font-weight: 800; text-transform: uppercase; color: #C8102E; margin-top: 10px; line-height: 1.1; }
                        .qr-container { flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px; flex-direction: column; }
                        .qr-img { width: 100%; max-width: 250px; height: auto; }
                        .table-tag { font-size: 48px; font-weight: 900; background: #008C45; color: white; padding: 5px 20px; border-radius: 50px; display: inline-block; margin-bottom: 10px; }
                        .instruction { font-size: 16px; color: #555; font-weight: bold; margin-bottom: 5px; }
                        .url-debug { font-size: 8px; color: #999; margin-top: 5px; word-break: break-all; }
                        .warning { color: red; font-size: 12px; font-weight: bold; margin-top: 5px; border: 1px solid red; padding: 2px; }
                        @media print {
                            body { background: none; display: block; -webkit-print-color-adjust: exact; }
                            .card { margin: 0 auto; page-break-after: always; border: 1px solid #ccc; height: auto; min-height: 500px; background: white !important; }
                            .warning { display: block !important; } 
                        }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div>
                             ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="logo" />` : ''}
                             <div class="title">Cardápio Digital</div>
                        </div>
                        <div class="qr-container">
                             <img src="${qrUrl}" class="qr-img" />
                             <div class="url-debug">${textUrl}</div>
                             ${isLocalhost ? '<div class="warning">AVISO: Você está rodando em Localhost.<br/>Este QR Code NÃO funcionará no celular.<br/>Faça o deploy do site para funcionar.</div>' : ''}
                        </div>
                        <div>
                             <div class="instruction">Aponte a câmera do celular</div>
                             <div class="table-tag">MESA ${tableNum}</div>
                        </div>
                    </div>
                    <script>
                        setTimeout(() => { window.print(); }, 2500);
                    </script>
                </body>
            </html>
          `); 
          win.document.close(); 
      } 
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === 'admin123') setIsAuthenticated(true);
    else alert('Senha incorreta. (Dica: A senha padrão é admin123)');
  };

  const filteredOrders = orders.filter(o => {
      if (orderFilter !== 'all' && o.status !== orderFilter) return false;
      if (activeOrderSection === 'tables') {
          return o.delivery_type === 'table';
      } else {
          return o.delivery_type !== 'table';
      }
  });

  if (!isAuthenticated) {
     return (
       <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-stone-200">
          <div className="flex justify-center mb-6">
            <div className="bg-stone-100 p-4 rounded-full">
              <Settings className="w-10 h-10 text-stone-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Área Administrativa</h2>
          <p className="text-stone-500 text-center mb-6 text-sm">
             Digite a senha para gerenciar o sistema
             <br/><span className="text-xs opacity-70">(Senha padrão: admin123)</span>
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Senha de Acesso</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-italian-red focus:border-italian-red outline-none"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-stone-900 text-white py-3 rounded-lg font-bold hover:bg-stone-800 transition-colors"
            >
              Entrar
            </button>
            <button 
              type="button" 
              onClick={onBack}
              className="w-full bg-transparent text-stone-500 py-3 rounded-lg font-bold hover:text-stone-700 transition-colors"
            >
              Voltar ao Cardápio
            </button>
          </form>
        </div>
      </div>
     );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20 text-stone-800 font-sans">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
         <div className="max-w-6xl mx-auto px-4 pt-4">
          
          {dbError && (
             <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm animate-in fade-in slide-in-from-top">
                <div className="flex items-center gap-2 font-bold"><Database className="w-5 h-5"/> ATENÇÃO: Banco de Dados Não Configurado</div>
                <p className="text-sm mt-1">O sistema não consegue salvar dados porque as tabelas não existem ou estão incorretas.</p>
                <div className="mt-2 bg-white p-2 rounded border border-red-200 text-xs font-mono overflow-x-auto">
                   {dbError}
                </div>
                <p className="text-xs mt-2 font-bold">SOLUÇÃO: Copie o arquivo schema.sql e rode no SQL Editor do Supabase.</p>
             </div>
          )}
          
          <div className="flex justify-between items-center mb-4 gap-2">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600"><ArrowLeft className="w-5 h-5" /></button>
              <h1 className="font-bold text-xl text-stone-800 hidden md:block">Gerenciar Sistema</h1>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                 {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                 <span className="hidden sm:inline">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={fetchOrders} className="p-2 bg-stone-100 border border-stone-200 hover:bg-stone-200 rounded-full text-stone-600" title="Atualizar Pedidos"><RefreshCw className="w-4 h-4"/></button>
               <button onClick={() => { if(window.confirm('Resetar cardápio para o padrão?')) onResetMenu(); }} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded border border-red-100 hover:bg-red-100 font-bold whitespace-nowrap">Resetar Tudo</button>
            </div>
          </div>
          <div className="flex space-x-1 md:space-x-6 overflow-x-auto hide-scrollbar pb-0">
             {[
               { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' }, 
               { id: 'orders', icon: ShoppingBag, label: 'Pedidos' }, 
               { id: 'menu', icon: Grid, label: 'Cardápio' }, 
               { id: 'coupons', icon: Ticket, label: 'Cupons' }, 
               { id: 'tables', icon: QrCode, label: 'Mesas' }, 
               { id: 'settings', icon: Settings, label: 'Config' },
               { id: 'integrations', icon: Bot, label: 'Robô WhatsApp' }
             ].map(tab => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-3 py-3 text-sm font-bold transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-italian-red text-italian-red' : 'border-transparent text-stone-500 hover:text-stone-800'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                 <div className="hidden xl:block"></div>
                 <div className="w-full flex flex-col sm:flex-row justify-end gap-3">
                     <div className="flex gap-1 overflow-x-auto pb-1 max-w-full hide-scrollbar flex-wrap">
                        {['today', 'week', 'month', 'all'].map(period => (
                            <button key={period} onClick={() => setDashboardPeriod(period as any)} className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors border whitespace-nowrap flex-shrink-0 ${dashboardPeriod === period ? 'bg-italian-red text-white border-italian-red' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>{period === 'today' ? 'Hoje' : period === 'week' ? '7 Dias' : period === 'month' ? '30 Dias' : 'Geral'}</button>
                        ))}
                        <button onClick={() => setDashboardPeriod('custom')} className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors border whitespace-nowrap flex-shrink-0 ${dashboardPeriod === 'custom' ? 'bg-italian-red text-white border-italian-red' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>Personalizado</button>
                     </div>
                     {dashboardPeriod === 'custom' && (
                        <div className="flex flex-col sm:flex-row gap-2 items-center bg-white p-2 rounded-lg border border-stone-200 w-full sm:w-auto">
                            <input type="date" value={customDashStart} onChange={e => setCustomDashStart(e.target.value)} className="p-1.5 text-xs border rounded w-full sm:w-auto" />
                            <span className="text-stone-400 hidden sm:inline">-</span>
                            <input type="date" value={customDashEnd} onChange={e => setCustomDashEnd(e.target.value)} className="p-1.5 text-xs border rounded w-full sm:w-auto" />
                        </div>
                     )}
                 </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className={CARD_STYLE}>
                     <h3 className="text-stone-500 text-xs md:text-sm font-bold uppercase flex items-center gap-2"><ShoppingBag className="w-4 h-4"/> Pedidos</h3>
                     <p className="text-2xl md:text-3xl font-bold text-stone-800 mt-2">{dashboardMetrics.totalOrders}</p>
                  </div>
                  <div className={CARD_STYLE}>
                     <h3 className="text-stone-500 text-xs md:text-sm font-bold uppercase flex items-center gap-2"><CreditCard className="w-4 h-4"/> Receita</h3>
                     <p className="text-2xl md:text-3xl font-bold text-green-600 mt-2">{settings.currencySymbol} {dashboardMetrics.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className={CARD_STYLE}>
                     <h3 className="text-stone-500 text-xs md:text-sm font-bold uppercase flex items-center gap-2"><Grid className="w-4 h-4"/> Produtos</h3>
                     <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">{menuData.reduce((acc, cat) => acc + cat.items.length, 0)}</p>
                  </div>
                  <div className={CARD_STYLE}>
                     <h3 className="text-stone-500 text-xs md:text-sm font-bold uppercase flex items-center gap-2"><Ticket className="w-4 h-4"/> Cupons</h3>
                     <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-2">{coupons.filter(c => c.active).length}</p>
                  </div>
              </div>

              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-4 text-stone-800 flex items-center gap-2"><Utensils className="w-5 h-5"/> Mais Vendidos</h3>
                 {dashboardMetrics.topProducts.length > 0 ? (
                    <div className="space-y-4">
                       {dashboardMetrics.topProducts.map((prod, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-stone-100 pb-2 last:border-0">
                             <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-stone-100 text-stone-500'}`}>{idx + 1}</span>
                                <span className="font-medium text-stone-700 text-sm md:text-base line-clamp-1">{prod.name}</span>
                             </div>
                             <span className="text-sm font-bold text-stone-600 whitespace-nowrap">{prod.count} un.</span>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <p className="text-stone-400 text-center py-4">Nenhum dado de venda para este período.</p>
                 )}
              </div>
           </div>
        )}

        {/* --- ORDERS, MENU, COUPONS, TABLES, SETTINGS SECTIONS REMAIN THE SAME --- */}
        {activeTab === 'orders' && (
           <div className="space-y-6 animate-in fade-in">
             <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-white p-1 rounded-lg shadow-sm border border-stone-200">
                    <button onClick={() => setActiveOrderSection('delivery')} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeOrderSection === 'delivery' ? 'bg-italian-red text-white' : 'text-stone-500 hover:bg-stone-100'}`}>Entrega / Retirada</button>
                    <button onClick={() => setActiveOrderSection('tables')} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeOrderSection === 'tables' ? 'bg-italian-red text-white' : 'text-stone-500 hover:bg-stone-100'}`}>Mesas</button>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-lg border border-stone-200 w-full md:w-auto overflow-x-auto">
                    {['all', 'pending', 'preparing', 'delivery', 'completed', 'cancelled'].map(status => (
                        <button key={status} onClick={() => setOrderFilter(status)} className={`px-3 py-1.5 text-xs font-bold rounded capitalize whitespace-nowrap ${orderFilter === status ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                           {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'preparing' ? 'Preparo' : status === 'delivery' ? 'Entrega' : status === 'completed' ? 'Concluídos' : 'Cancelados'}
                        </button>
                    ))}
                </div>
             </div>

             <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                   <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
                      <ShoppingBag className="w-12 h-12 mx-auto text-stone-300 mb-2" />
                      <p className="text-stone-500">Nenhum pedido encontrado.</p>
                   </div>
                ) : (
                   filteredOrders.map(order => (
                      <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                         <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                               <span className="font-bold text-lg">#{order.id}</span>
                               <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                  order.status === 'delivery' ? 'bg-orange-100 text-orange-700' :
                                  order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  'bg-red-100 text-red-700'
                               }`}>
                                  {order.status === 'pending' ? 'Pendente' : order.status === 'preparing' ? 'Em Preparo' : order.status === 'delivery' ? 'Saiu p/ Entrega' : order.status === 'completed' ? 'Concluído' : 'Cancelado'}
                               </span>
                               <span className="text-xs text-stone-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="mb-2">
                               <p className="font-bold text-stone-800">{order.customer_name}</p>
                               {order.delivery_type === 'table' ? (
                                   <p className="text-sm text-green-600 font-bold flex items-center gap-1"><Utensils className="w-3 h-3"/> MESA {order.table_number}</p>
                               ) : (
                                   <p className="text-sm text-stone-500 flex items-center gap-1">
                                      {order.delivery_type === 'delivery' ? <Truck className="w-3 h-3"/> : <StoreIcon className="w-3 h-3"/>}
                                      {order.delivery_type === 'delivery' ? `${order.address_street}, ${order.address_number} - ${order.address_district}` : 'Retirada no Balcão'}
                                   </p>
                               )}
                            </div>
                            <div className="text-sm text-stone-600 border-l-2 border-stone-200 pl-2">
                               {order.items.map((item: any, idx: number) => (
                                  <div key={idx}>{item.quantity}x {item.name} <span className="text-stone-400 text-xs">({settings.currencySymbol} {(item.price * item.quantity).toFixed(2)})</span></div>
                               ))}
                            </div>
                         </div>
                         <div className="flex flex-col items-end gap-2 min-w-[150px]">
                            <p className="font-bold text-xl text-italian-green">{settings.currencySymbol} {order.total.toFixed(2)}</p>
                            <div className="flex flex-col gap-1 w-full">
                               <select 
                                 value={order.status} 
                                 onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                 disabled={isUpdatingOrder === order.id}
                                 className="p-2 border rounded bg-stone-50 text-sm w-full outline-none focus:ring-1 focus:ring-italian-red"
                               >
                                  <option value="pending">Pendente</option>
                                  <option value="preparing">Em Preparo</option>
                                  <option value="delivery">{order.delivery_type === 'table' ? 'Entregue na Mesa' : 'Saiu p/ Entrega'}</option>
                                  <option value="completed">Finalizado</option>
                                  <option value="cancelled">Cancelar</option>
                               </select>
                               <button onClick={() => handlePrintOrder(order)} className="flex items-center justify-center gap-1 bg-stone-800 text-white p-2 rounded text-sm hover:bg-stone-700 w-full">
                                  <Printer className="w-4 h-4" /> Imprimir
                               </button>
                            </div>
                         </div>
                      </div>
                   ))
                )}
             </div>
           </div>
        )}

        {activeTab === 'menu' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="font-bold text-xl">Cardápio</h2>
                 <div className="flex gap-2">
                     <button onClick={() => setIsAddingCategory(true)} className="bg-stone-200 text-stone-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-stone-300 flex items-center gap-2"><Plus className="w-4 h-4"/> Nova Categoria</button>
                     <button onClick={() => setIsAddingNew(true)} className="bg-italian-green text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2"><Plus className="w-4 h-4"/> Novo Produto</button>
                 </div>
              </div>

              {isAddingCategory && (
                  <div className="bg-white p-4 rounded-xl border border-stone-200 mb-4 flex gap-2 items-end">
                      <div className="flex-1">
                          <label className="text-xs font-bold text-stone-500">Nome da Categoria</label>
                          <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Ex: Bebidas, Lanches..." />
                      </div>
                      <button onClick={() => { if(newCategoryName) { onAddCategory(newCategoryName); setNewCategoryName(''); setIsAddingCategory(false); } }} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">Salvar</button>
                      <button onClick={() => setIsAddingCategory(false)} className="bg-stone-200 text-stone-600 px-4 py-2 rounded-lg font-bold">Cancelar</button>
                  </div>
              )}

              <div className="space-y-4">
                 {menuData.map(category => (
                    <div key={category.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                       <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}>
                          <div className="flex items-center gap-3">
                             {expandedCategory === category.id ? <ChevronUp className="w-5 h-5 text-stone-400"/> : <ChevronDown className="w-5 h-5 text-stone-400"/>}
                             <h3 className="font-bold text-lg">{category.name} <span className="text-stone-400 text-sm font-normal">({category.items.length} itens)</span></h3>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => onDeleteCategory(category.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       </div>
                       
                       {expandedCategory === category.id && (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-stone-50/50">
                             {category.items.map(product => (
                                <div key={product.id} className="bg-white p-3 rounded-lg border border-stone-200 flex gap-3 group hover:border-italian-red transition-colors relative">
                                   <div className="w-16 h-16 bg-stone-100 rounded-md flex-shrink-0 overflow-hidden">
                                      {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300"><ImageIcon className="w-6 h-6"/></div>}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-stone-800 text-sm truncate">{product.name}</h4>
                                      <p className="text-xs text-stone-500 line-clamp-1">{product.description}</p>
                                      <p className="text-sm font-bold text-italian-green mt-1">{settings.currencySymbol} {product.price.toFixed(2)}</p>
                                   </div>
                                   <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                                      <button onClick={() => startEditing(product)} className="p-1.5 bg-blue-50 text-blue-600 rounded shadow-sm hover:bg-blue-100"><Edit3 className="w-4 h-4"/></button>
                                      <button onClick={() => onDeleteProduct(category.id, product.id)} className="p-1.5 bg-red-50 text-red-600 rounded shadow-sm hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                                </div>
                             ))}
                             <button onClick={() => { setIsAddingNew(true); setNewProductForm({ ...newProductForm, category: category.id }); }} className="border-2 border-dashed border-stone-300 rounded-lg flex items-center justify-center p-4 text-stone-400 hover:border-italian-green hover:text-italian-green hover:bg-green-50 transition-colors font-bold text-sm gap-2 h-24">
                                <Plus className="w-5 h-5" /> Adicionar Produto
                             </button>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'coupons' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                 <h2 className="font-bold text-xl">Cupons de Desconto</h2>
                 <button onClick={() => setIsAddingCoupon(true)} className="bg-italian-green text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2"><Plus className="w-4 h-4"/> Criar Cupom</button>
              </div>

              {isAddingCoupon && (
                 <div className={CARD_STYLE + " mb-6 border-l-4 border-l-italian-red"}>
                    <h3 className="font-bold mb-4">{editingCouponId ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                       <div><label className={LABEL_STYLE}>Código (Ex: PROMO10)</label><input value={couponForm.code || ''} onChange={(e) => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} className={INPUT_STYLE} placeholder="CÓDIGO"/></div>
                       <div><label className={LABEL_STYLE}>Tipo de Desconto</label>
                          <select value={couponForm.type} onChange={(e) => setCouponForm({...couponForm, type: e.target.value as any})} className={INPUT_STYLE}>
                             <option value="percent">Porcentagem (%)</option>
                             <option value="fixed">Valor Fixo ({settings.currencySymbol})</option>
                             <option value="free_shipping">Frete Grátis</option>
                          </select>
                       </div>
                       <div><label className={LABEL_STYLE}>Valor do Desconto</label><input type="number" value={couponForm.discount_value || ''} onChange={(e) => setCouponForm({...couponForm, discount_value: Number(e.target.value)})} className={INPUT_STYLE} disabled={couponForm.type === 'free_shipping'} placeholder="0" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                       <div><label className={LABEL_STYLE}>Pedido Mínimo</label><input type="number" value={couponForm.min_order_value || ''} onChange={(e) => setCouponForm({...couponForm, min_order_value: Number(e.target.value)})} className={INPUT_STYLE} placeholder="0.00"/></div>
                       <div><label className={LABEL_STYLE}>Validade (Opcional)</label><input type="date" value={couponForm.end_date || ''} onChange={(e) => setCouponForm({...couponForm, end_date: e.target.value})} className={INPUT_STYLE} /></div>
                       <div className="flex items-center pt-6"><label className="flex items-center gap-2 cursor-pointer font-bold text-stone-700"><input type="checkbox" checked={couponForm.active} onChange={(e) => setCouponForm({...couponForm, active: e.target.checked})} className="w-5 h-5 text-italian-green rounded" /> Cupom Ativo</label></div>
                    </div>
                    <div className="flex justify-end gap-2">
                       <button onClick={cancelEditCoupon} className="px-4 py-2 text-stone-500 hover:text-stone-800 font-bold">Cancelar</button>
                       <button onClick={handleSaveCoupon} className="bg-italian-green text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">Salvar Cupom</button>
                    </div>
                 </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-50 text-stone-500 text-xs uppercase font-bold border-b border-stone-200">
                       <tr>
                          <th className="p-4">Código</th>
                          <th className="p-4">Desconto</th>
                          <th className="p-4">Regras</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="text-sm">
                       {coupons.map(coupon => (
                          <tr key={coupon.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                             <td className="p-4 font-bold font-mono text-lg">{coupon.code}</td>
                             <td className="p-4 text-green-600 font-bold">
                                {coupon.type === 'free_shipping' ? 'Frete Grátis' : coupon.type === 'percent' ? `${coupon.discount_value}%` : `${settings.currencySymbol} ${coupon.discount_value}`}
                             </td>
                             <td className="p-4 text-stone-500">
                                {coupon.min_order_value ? `Mín: ${settings.currencySymbol} ${coupon.min_order_value}` : 'Sem mínimo'}
                                {coupon.end_date && <span className="block text-xs">Vence: {new Date(coupon.end_date).toLocaleDateString('pt-BR')}</span>}
                             </td>
                             <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{coupon.active ? 'ATIVO' : 'INATIVO'}</span></td>
                             <td className="p-4 text-right space-x-2">
                                <button onClick={() => handleEditCoupon(coupon)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit3 className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                             </td>
                          </tr>
                       ))}
                       {coupons.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-stone-400">Nenhum cupom cadastrado.</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'tables' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="font-bold text-xl">Gestão de Mesas</h2>
                 <div className="flex gap-2 items-center bg-white p-1 rounded-lg border border-stone-300">
                    <input type="text" value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} placeholder="Nº Mesa" className="w-20 p-2 text-center font-bold outline-none text-sm" />
                    <button onClick={handleAddTable} className="bg-italian-green text-white px-3 py-1.5 rounded font-bold text-sm hover:bg-green-700"><Plus className="w-4 h-4"/></button>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {tables.map(table => (
                    <div key={table.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col items-center justify-between group hover:border-italian-red transition-all">
                       <span className="text-xs font-bold text-stone-400 uppercase mb-2">Mesa</span>
                       <span className="text-4xl font-black text-stone-800 mb-4">{table.number}</span>
                       <div className="flex w-full gap-2">
                          <button onClick={() => printQrCode(table.number)} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 rounded-lg flex items-center justify-center" title="Imprimir QR Code"><QrCode className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteTable(table.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                       </div>
                    </div>
                 ))}
                 {tables.length === 0 && <div className="col-span-full text-center py-12 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">Nenhuma mesa cadastrada.</div>}
              </div>
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-6 animate-in fade-in">
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Settings className="w-5 h-5"/> Informações Gerais</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={LABEL_STYLE}>Nome da Loja</label><input value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className={INPUT_STYLE} /></div>
                    <div><label className={LABEL_STYLE}>WhatsApp (Somente Números)</label><input value={settingsForm.whatsapp} onChange={e => setSettingsForm({...settingsForm, whatsapp: e.target.value})} className={INPUT_STYLE} /></div>
                    <div><label className={LABEL_STYLE}>CNPJ</label><input value={settingsForm.cnpj || ''} onChange={e => setSettingsForm({...settingsForm, cnpj: e.target.value})} className={INPUT_STYLE} placeholder="00.000.000/0000-00" /></div>
                    <div><label className={LABEL_STYLE}>Telefones Adicionais</label>
                       <div className="flex gap-2">
                           <input value={newPhone} onChange={e => setNewPhone(e.target.value)} className={INPUT_STYLE} placeholder="Adicionar telefone" />
                           <button onClick={handleAddPhone} className="bg-stone-200 px-4 rounded-lg font-bold"><Plus className="w-4 h-4"/></button>
                       </div>
                       <div className="mt-2 flex flex-wrap gap-2">
                           {settingsForm.phones.map((p, i) => (
                               <span key={i} className="bg-stone-100 px-2 py-1 rounded text-xs flex items-center gap-1">{p} <button onClick={() => handleRemovePhone(i)}><X className="w-3 h-3"/></button></span>
                           ))}
                       </div>
                    </div>
                    <div className="col-span-1 md:col-span-2"><label className={LABEL_STYLE}>Endereço Completo</label><input value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} className={INPUT_STYLE} /></div>
                    <div><label className={LABEL_STYLE}>Moeda</label><input value={settingsForm.currencySymbol} onChange={e => setSettingsForm({...settingsForm, currencySymbol: e.target.value})} className={INPUT_STYLE} placeholder="R$" /></div>
                    <div className="flex items-center gap-4 mt-6">
                        <label className="flex items-center gap-2 font-bold cursor-pointer text-stone-700">
                           <input type="checkbox" checked={settingsForm.enableGuide} onChange={e => setSettingsForm({...settingsForm, enableGuide: e.target.checked})} className="w-5 h-5 accent-italian-green" /> Ativar Guia Inicial
                        </label>
                        <label className="flex items-center gap-2 font-bold cursor-pointer text-stone-700">
                           <input type="checkbox" checked={settingsForm.enableTableOrder} onChange={e => setSettingsForm({...settingsForm, enableTableOrder: e.target.checked})} className="w-5 h-5 accent-italian-green" /> Pedidos na Mesa
                        </label>
                    </div>
                 </div>
              </div>

              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Clock className="w-5 h-5"/> Horários de Funcionamento</h3>
                 <div className="space-y-4">
                     {WEEKDAYS_ORDER.map((dayKey) => {
                         const schedule = settingsForm.schedule || {} as WeeklySchedule;
                         const daySchedule = schedule[dayKey as keyof WeeklySchedule] || { isOpen: false, intervals: [] };
                         return (
                             <div key={dayKey} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                                 <div className="flex items-center gap-3 w-40">
                                     <input type="checkbox" checked={daySchedule.isOpen} onChange={(e) => handleScheduleUpdate(dayKey, 'isOpen', e.target.checked)} className="w-5 h-5 accent-italian-green" />
                                     <span className={`font-bold ${daySchedule.isOpen ? 'text-stone-800' : 'text-stone-400'}`}>{WEEKDAYS_PT[dayKey as keyof typeof WEEKDAYS_PT]}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     {daySchedule.isOpen ? (
                                         daySchedule.intervals?.map((int, i) => (
                                             <div key={i} className="flex items-center gap-2">
                                                 <input type="time" value={int.start} onChange={(e) => handleScheduleUpdate(dayKey, 'start', e.target.value)} className="p-1 border rounded bg-white text-sm" />
                                                 <span>às</span>
                                                 <input type="time" value={int.end} onChange={(e) => handleScheduleUpdate(dayKey, 'end', e.target.value)} className="p-1 border rounded bg-white text-sm" />
                                             </div>
                                         )) || <span className="text-red-500 text-xs">Erro no horário</span>
                                     ) : (
                                         <span className="text-sm text-stone-400 italic">Fechado</span>
                                     )}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
              </div>

              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><MapPin className="w-5 h-5"/> Regiões de Entrega</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-stone-50 p-4 rounded-xl">
                     <div><input value={newRegionName} onChange={e => setNewRegionName(e.target.value)} className={INPUT_STYLE} placeholder="Nome da Região" /></div>
                     <div><input type="number" value={newRegionPrice} onChange={e => setNewRegionPrice(e.target.value)} className={INPUT_STYLE} placeholder="Preço (R$)" /></div>
                     <button onClick={handleAddRegion} className="bg-italian-green text-white font-bold rounded-lg hover:bg-green-700">Adicionar Região</button>
                     <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input value={newRegionZips} onChange={e => setNewRegionZips(e.target.value)} className={INPUT_STYLE} placeholder="CEPs (Ex: 13295000-13295999, 13296)" />
                        <input value={newRegionNeighborhoods} onChange={e => setNewRegionNeighborhoods(e.target.value)} className={INPUT_STYLE} placeholder="Bairros (Ex: Centro, Jardim Primavera)" />
                        <input value={newRegionExclusions} onChange={e => setNewRegionExclusions(e.target.value)} className={INPUT_STYLE} placeholder="Excluir CEPs (Opcional)" />
                     </div>
                 </div>
                 <div className="space-y-2">
                     {(settingsForm.deliveryRegions || []).map(region => (
                         <div key={region.id} className="flex justify-between items-center p-3 border rounded-lg bg-white">
                             <div>
                                 <span className="font-bold block">{region.name}</span>
                                 <span className="text-xs text-stone-500">
                                    {region.zipRules?.join(', ')} {region.neighborhoods?.length ? `| ${region.neighborhoods.join(', ')}` : ''}
                                 </span>
                             </div>
                             <div className="flex items-center gap-4">
                                 <span className="font-bold text-green-600">{settings.currencySymbol} {region.price.toFixed(2)}</span>
                                 <button onClick={() => handleRemoveRegion(region.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                             </div>
                         </div>
                     ))}
                 </div>
                 <div className="mt-4">
                    <label className="flex items-center gap-2 font-bold cursor-pointer text-stone-700">
                        <input type="checkbox" checked={settingsForm.freeShipping} onChange={e => setSettingsForm({...settingsForm, freeShipping: e.target.checked})} className="w-5 h-5 accent-italian-green" /> 
                        Ativar Frete Grátis Global (Para testes ou promoções)
                    </label>
                 </div>
              </div>

              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Share2 className="w-5 h-5"/> Redes Sociais</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                       <Instagram className="w-5 h-5 text-pink-600" />
                       <input value={settingsForm.instagram || ''} onChange={e => setSettingsForm({...settingsForm, instagram: e.target.value})} className={INPUT_STYLE} placeholder="Instagram URL" />
                    </div>
                    <div className="flex items-center gap-2">
                       <Facebook className="w-5 h-5 text-blue-600" />
                       <input value={settingsForm.facebook || ''} onChange={e => setSettingsForm({...settingsForm, facebook: e.target.value})} className={INPUT_STYLE} placeholder="Facebook URL" />
                    </div>
                    <div className="flex items-center gap-2">
                       <Youtube className="w-5 h-5 text-red-600" />
                       <input value={settingsForm.youtube || ''} onChange={e => setSettingsForm({...settingsForm, youtube: e.target.value})} className={INPUT_STYLE} placeholder="YouTube URL" />
                    </div>
                    <div className="flex items-center gap-2">
                       <StoreIcon className="w-5 h-5 text-blue-500" />
                       <input value={settingsForm.googleBusiness || ''} onChange={e => setSettingsForm({...settingsForm, googleBusiness: e.target.value})} className={INPUT_STYLE} placeholder="Google Meu Negócio URL" />
                    </div>
                 </div>
              </div>

              <div className={CARD_STYLE}>
                  <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Palette className="w-5 h-5"/> Identidade Visual</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div>
                          <label className={LABEL_STYLE}>Logo da Loja</label>
                          <div className="flex items-center gap-4">
                              <label className="w-24 h-24 bg-stone-100 border border-stone-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative shadow-inner">
                                  {settingsForm.logoUrl ? <img src={settingsForm.logoUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-stone-400" />}
                                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                  {isProcessingLogo && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white"/></div>}
                              </label>
                              <div className="flex flex-col gap-2">
                                  <button onClick={() => document.querySelector<HTMLInputElement>('input[type=file][onChange=handleLogoUpload]')?.click()} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded font-bold hover:bg-blue-100">Alterar</button>
                                  {settingsForm.logoUrl && <button onClick={() => setSettingsForm({...settingsForm, logoUrl: ''})} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded font-bold hover:bg-red-100 flex items-center gap-1"><Trash2 className="w-3 h-3"/> Remover</button>}
                              </div>
                          </div>
                      </div>
                      <div>
                          <label className={LABEL_STYLE}>Ícone da Aba (Favicon)</label>
                          <div className="flex items-center gap-4">
                              <label className="w-16 h-16 bg-stone-100 border border-stone-300 rounded flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative shadow-inner">
                                  {settingsForm.faviconUrl ? <img src={settingsForm.faviconUrl} className="w-8 h-8 object-contain" /> : <Globe className="w-6 h-6 text-stone-400" />}
                                  <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" />
                                  {isProcessingFavicon && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-white"/></div>}
                              </label>
                              <div className="flex flex-col gap-2">
                                  <button onClick={() => document.querySelector<HTMLInputElement>('input[type=file][onChange=handleFaviconUpload]')?.click()} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded font-bold hover:bg-blue-100">Alterar</button>
                              </div>
                          </div>
                      </div>
                      <div>
                          <label className={LABEL_STYLE}>Banner SEO (Compartilhamento)</label>
                          <label className="w-full h-24 bg-stone-100 border border-stone-300 rounded flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative shadow-inner">
                              {settingsForm.seoBannerUrl ? <img src={settingsForm.seoBannerUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-stone-400" />}
                              <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                              {isProcessingBanner && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white"/></div>}
                          </label>
                      </div>
                   </div>

                   <div className="mb-6">
                       <label className={LABEL_STYLE}>Fonte do Site</label>
                       <div className="flex gap-2 flex-wrap">
                          {FONTS_LIST.map(font => (
                             <button key={font} onClick={() => setSettingsForm({...settingsForm, fontFamily: font})} className={`px-4 py-2 rounded border text-sm ${settingsForm.fontFamily === font ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300'}`} style={{ fontFamily: font }}>
                                {font}
                             </button>
                          ))}
                       </div>
                   </div>
                   
                   <div>
                       <div className="flex gap-2 border-b border-stone-200 mb-4">
                          <button onClick={() => setColorTab('general')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${colorTab === 'general' ? 'border-italian-red text-italian-red' : 'border-transparent text-stone-500'}`}>Cores Principais</button>
                          <button onClick={() => setColorTab('light')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${colorTab === 'light' ? 'border-italian-red text-italian-red' : 'border-transparent text-stone-500'}`}><Sun className="w-4 h-4 inline mr-1"/> Modo Claro</button>
                          <button onClick={() => setColorTab('dark')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${colorTab === 'dark' ? 'border-italian-red text-italian-red' : 'border-transparent text-stone-500'}`}><Moon className="w-4 h-4 inline mr-1"/> Modo Escuro</button>
                       </div>
                       
                       {colorTab === 'general' && (
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className={LABEL_STYLE}>Cor Primária</label><div className="flex gap-2"><input type="color" value={settingsForm.colors?.primary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, primary: e.target.value}})} className="h-10 w-10 p-0 border-0 rounded cursor-pointer" /><input type="text" value={settingsForm.colors?.primary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, primary: e.target.value}})} className={INPUT_STYLE} /></div></div>
                             <div><label className={LABEL_STYLE}>Cor Secundária</label><div className="flex gap-2"><input type="color" value={settingsForm.colors?.secondary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, secondary: e.target.value}})} className="h-10 w-10 p-0 border-0 rounded cursor-pointer" /><input type="text" value={settingsForm.colors?.secondary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, secondary: e.target.value}})} className={INPUT_STYLE} /></div></div>
                          </div>
                       )}

                       {colorTab === 'light' && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                             <div><label className={LABEL_STYLE}>Fundo Página</label><input type="color" value={settingsForm.colors?.modes?.light.background} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: {...settingsForm.colors!.modes!, light: {...settingsForm.colors!.modes!.light, background: e.target.value}}}})} className="w-full h-10 cursor-pointer" /></div>
                             <div><label className={LABEL_STYLE}>Fundo Cartão</label><input type="color" value={settingsForm.colors?.modes?.light.cardBackground} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: {...settingsForm.colors!.modes!, light: {...settingsForm.colors!.modes!.light, cardBackground: e.target.value}}}})} className="w-full h-10 cursor-pointer" /></div>
                             <div><label className={LABEL_STYLE}>Texto Principal</label><input type="color" value={settingsForm.colors?.modes?.light.text} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: {...settingsForm.colors!.modes!, light: {...settingsForm.colors!.modes!.light, text: e.target.value}}}})} className="w-full h-10 cursor-pointer" /></div>
                          </div>
                       )}

                       {colorTab === 'dark' && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-stone-900 p-4 rounded-xl border border-stone-700">
                             <div><label className="block text-sm font-bold text-white mb-1">Fundo Página</label><input type="color" value={settingsForm.colors?.modes?.dark.background} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: {...settingsForm.colors!.modes!, dark: {...settingsForm.colors!.modes!.dark, background: e.target.value}}}})} className="w-full h-10 cursor-pointer" /></div>
                             <div><label className="block text-sm font-bold text-white mb-1">Fundo Cartão</label><input type="color" value={settingsForm.colors?.modes?.dark.cardBackground} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: {...settingsForm.colors!.modes!, dark: {...settingsForm.colors!.modes!.dark, cardBackground: e.target.value}}}})} className="w-full h-10 cursor-pointer" /></div>
                             <div><label className="block text-sm font-bold text-white mb-1">Texto Principal</label><input type="color" value={settingsForm.colors?.modes?.dark.text} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: {...settingsForm.colors!.modes!, dark: {...settingsForm.colors!.modes!.dark, text: e.target.value}}}})} className="w-full h-10 cursor-pointer" /></div>
                          </div>
                       )}
                   </div>
              </div>

               {/* SAVE BUTTON */}
              <div className="flex justify-end sticky bottom-6 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-stone-200 shadow-lg z-20">
                  <button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition-transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center">
                        {isSavingSettings ? <Loader2 className="w-6 h-6 animate-spin"/> : <Save className="w-6 h-6" />}
                        {isSavingSettings ? 'Salvando...' : 'Salvar Todas as Configurações'}
                  </button>
              </div>
           </div>
        )}

        {activeTab === 'integrations' && (
           <div className="space-y-6 animate-in fade-in">
              <div className={CARD_STYLE + " bg-gradient-to-br from-white to-green-50"}>
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-800"><Bot className="w-6 h-6"/> Configuração do Robô de WhatsApp</h3>
                 <p className="text-sm text-stone-600 mb-6">
                    Configure a inteligência artificial para atender seus clientes automaticamente via WhatsApp. 
                    <br/><strong>Nota:</strong> Esta funcionalidade requer a <strong>Evolution API</strong> e uma <strong>Supabase Edge Function</strong> configurada.
                 </p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                         <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                             <h4 className="font-bold text-yellow-800 text-sm mb-2">Instruções de Instalação</h4>
                             <p className="text-xs text-yellow-700 mb-2">Para que o robô funcione sem n8n, você precisa copiar o link abaixo e colar no campo <strong>Webhook URL</strong> da sua Evolution API.</p>
                             <div className="flex items-center gap-2 bg-white p-2 rounded border border-yellow-200">
                                <code className="text-xs font-mono text-stone-600 flex-1 break-all">{webhookUrl}</code>
                                <button onClick={() => { navigator.clipboard.writeText(webhookUrl); alert('URL copiada!'); }} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200 font-bold">Copiar</button>
                             </div>
                         </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className={LABEL_STYLE + " flex items-center gap-2"}><MessageSquare className="w-4 h-4" /> Personalidade do Robô (Prompt do Sistema)</label>
                        <textarea 
                           rows={8}
                           value={settingsForm.aiSystemPrompt || ''} 
                           onChange={e => setSettingsForm({...settingsForm, aiSystemPrompt: e.target.value})} 
                           className={INPUT_STYLE + " font-mono text-sm"}
                           placeholder={`Exemplo: Você é o Luigi, um garçom italiano muito simpático da Pizzaria Spagnolli.
1. Sempre cumprimente dizendo "Mamma Mia!" ou "Ciao Bello/Bella!".
2. Se o cliente perguntar o cardápio, liste apenas as categorias principais.
3. Não invente preços, use as ferramentas disponíveis.
...`} 
                        />
                        <p className="text-xs text-stone-500 mt-1">
                           Este texto define como o robô deve falar e quais regras ele deve seguir. Se deixar vazio, usaremos um padrão.
                        </p>
                    </div>

                    <div className="col-span-1 md:col-span-2 border-t border-stone-200 my-2"></div>
                    
                    {/* OpenAI Config */}
                    <div className="col-span-1 md:col-span-2 bg-stone-100 p-4 rounded-lg border border-stone-200">
                        <label className={LABEL_STYLE + " flex items-center gap-2"}><Zap className="w-4 h-4 text-purple-600" /> OpenAI API Key (ChatGPT)</label>
                        <div className="flex gap-2">
                             <input 
                                type="password"
                                value={settingsForm.openaiApiKey || ''} 
                                onChange={e => setSettingsForm({...settingsForm, openaiApiKey: e.target.value})} 
                                className={INPUT_STYLE} 
                                placeholder="sk-proj-..." 
                             />
                             <button onClick={handleTestOpenAI} disabled={isTestingOpenAI} className="bg-stone-800 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-stone-700 whitespace-nowrap min-w-[140px] flex items-center justify-center gap-2">
                                 {isTestingOpenAI ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Testar Conexão'}
                             </button>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                           Chave necessária para gerar as respostas inteligentes.
                        </p>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className={LABEL_STYLE}>URL da API (Evolution API)</label>
                        <input 
                           value={settingsForm.evolutionApiUrl || ''} 
                           onChange={e => setSettingsForm({...settingsForm, evolutionApiUrl: e.target.value})} 
                           className={INPUT_STYLE} 
                           placeholder="https://api.seudominio.com" 
                        />
                    </div>
                    
                    <div>
                        <label className={LABEL_STYLE}>API Key (Global)</label>
                        <input 
                           type="password"
                           value={settingsForm.evolutionApiKey || ''} 
                           onChange={e => setSettingsForm({...settingsForm, evolutionApiKey: e.target.value})} 
                           className={INPUT_STYLE} 
                           placeholder="Ex: 429683C4C977415CAAFCCE10F7D57E11" 
                        />
                    </div>
                    
                    <div>
                        <label className={LABEL_STYLE}>Nome da Instância</label>
                        <input 
                           value={settingsForm.evolutionInstanceName || ''} 
                           onChange={e => setSettingsForm({...settingsForm, evolutionInstanceName: e.target.value})} 
                           className={INPUT_STYLE} 
                           placeholder="Ex: MinhaPizzaria" 
                        />
                    </div>
                 </div>
              </div>

               {/* SAVE BUTTON */}
              <div className="flex justify-end sticky bottom-6 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-stone-200 shadow-lg z-20">
                  <button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition-transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center">
                        {isSavingSettings ? <Loader2 className="w-6 h-6 animate-spin"/> : <Save className="w-6 h-6" />}
                        {isSavingSettings ? 'Salvando...' : 'Salvar Configurações do Robô'}
                  </button>
              </div>
           </div>
        )}

      </main>

      {/* Product Editor Modal */}
      {(isAddingNew || editingProduct) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="font-bold text-xl">{isAddingNew ? 'Novo Produto' : 'Editar Produto'}</h2>
              <button onClick={() => { setIsAddingNew(false); setEditingProduct(null); }}><X className="w-6 h-6 text-stone-400 hover:text-stone-600" /></button>
            </div>
            
            <div className="p-6 space-y-6 flex-1">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className={LABEL_STYLE}>Nome do Produto</label>
                    <input value={isAddingNew ? newProductForm.name || '' : editForm.name || ''} onChange={(e) => isAddingNew ? setNewProductForm({...newProductForm, name: e.target.value}) : setEditForm({...editForm, name: e.target.value})} className={INPUT_STYLE} placeholder="Ex: Pizza Calabresa" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_STYLE}>Preço</label>
                        <input type="number" value={isAddingNew ? newProductForm.price || '' : editForm.price || ''} onChange={(e) => isAddingNew ? setNewProductForm({...newProductForm, price: Number(e.target.value)}) : setEditForm({...editForm, price: Number(e.target.value)})} className={INPUT_STYLE} placeholder="0.00" />
                    </div>
                    <div>
                        <label className={LABEL_STYLE}>Código (Opcional)</label>
                        <input value={isAddingNew ? newProductForm.code || '' : editForm.code || ''} onChange={(e) => isAddingNew ? setNewProductForm({...newProductForm, code: e.target.value}) : setEditForm({...editForm, code: e.target.value})} className={INPUT_STYLE} placeholder="Ex: 01" />
                    </div>
                 </div>
                 <div className="col-span-1 md:col-span-2">
                    <label className={LABEL_STYLE}>Descrição</label>
                    <textarea value={isAddingNew ? newProductForm.description || '' : editForm.description || ''} onChange={(e) => isAddingNew ? setNewProductForm({...newProductForm, description: e.target.value}) : setEditForm({...editForm, description: e.target.value})} className={INPUT_STYLE} rows={3} placeholder="Ingredientes e detalhes..." />
                 </div>
                 
                 <div>
                    <label className={LABEL_STYLE}>Categoria Principal</label>
                    <select value={isAddingNew ? newProductForm.category : editForm.category_id} onChange={(e) => isAddingNew ? setNewProductForm({...newProductForm, category: e.target.value}) : setEditForm({...editForm, category_id: e.target.value})} className={INPUT_STYLE}>
                       {menuData.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className={LABEL_STYLE}>Subcategoria (Opcional)</label>
                    <input value={isAddingNew ? newProductForm.subcategory || '' : editForm.subcategory || ''} onChange={(e) => isAddingNew ? setNewProductForm({...newProductForm, subcategory: e.target.value}) : setEditForm({...editForm, subcategory: e.target.value})} className={INPUT_STYLE} placeholder="Ex: Tradicionais, Especiais" />
                 </div>

                 {/* Additional Categories */}
                 <div className="col-span-1 md:col-span-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <label className={LABEL_STYLE}>Categorias Adicionais (Aparecer em mais lugares)</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                       {menuData.map(cat => {
                          const currentCats = isAddingNew ? (newProductForm.additional_categories || []) : (editForm.additional_categories || []);
                          const isSelected = currentCats.includes(cat.id);
                          // Don't show main category
                          if (cat.id === (isAddingNew ? newProductForm.category : editForm.category_id)) return null;
                          return (
                             <button key={cat.id} onClick={() => toggleAdditionalCategory(cat.id, isAddingNew)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${isSelected ? 'bg-italian-green text-white border-italian-green' : 'bg-white text-stone-600 border-stone-300'}`}>
                                {cat.name}
                             </button>
                          )
                       })}
                    </div>
                 </div>

                 <div className="col-span-1 md:col-span-2">
                    <label className={LABEL_STYLE}>Imagem do Produto</label>
                    <div className="flex items-center gap-4">
                       <label className="w-32 h-32 bg-stone-100 border border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative">
                          {(isAddingNew ? newProductForm.image : editForm.image) ? <img src={isAddingNew ? newProductForm.image : editForm.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-stone-400" />}
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, isAddingNew)} className="hidden" />
                          {isProcessingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white"/></div>}
                       </label>
                       <div className="flex flex-col gap-2">
                          <button onClick={() => document.querySelector<HTMLInputElement>('input[type=file][onChange]')?.click()} className="text-sm bg-stone-200 px-4 py-2 rounded-lg font-bold hover:bg-stone-300">Carregar Imagem</button>
                          <p className="text-xs text-stone-500">Recomendado: 800x600px (JPG/PNG)</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Options Section */}
              <div className="border-t border-stone-200 pt-6">
                 <h3 className="font-bold text-lg mb-4">Opções e Adicionais</h3>
                 
                 {/* New Option Input */}
                 <div className="flex gap-2 mb-6 items-end bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <div className="flex-1">
                       <label className="text-xs font-bold text-stone-500 mb-1">Nome do Grupo (Ex: Borda, Tamanho)</label>
                       <input value={newOptionName} onChange={e => setNewOptionName(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Digite o nome..." />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-stone-500 mb-1">Tipo</label>
                       <select value={newOptionType} onChange={e => setNewOptionType(e.target.value as any)} className="p-2 border rounded-lg h-[42px]">
                          <option value="single">Seleção Única (Radio)</option>
                          <option value="multiple">Múltipla Escolha (Checkbox)</option>
                       </select>
                    </div>
                    <button onClick={() => addOptionToForm(isAddingNew)} className="bg-italian-green text-white px-4 py-2 rounded-lg font-bold h-[42px]">Adicionar</button>
                 </div>

                 {/* Options List */}
                 <div className="space-y-4">
                    {currentOptions.map((opt, idx) => (
                       <div key={opt.id} className="border border-stone-200 rounded-xl p-4 relative">
                          <button onClick={() => removeOptionFromForm(opt.id, isAddingNew)} className="absolute top-4 right-4 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                          <div className="flex items-center gap-2 mb-3">
                             <h4 className="font-bold text-stone-800">{opt.name}</h4>
                             <span className="text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-500">{opt.type === 'single' ? 'Seleção Única' : 'Múltipla Escolha'}</span>
                          </div>
                          
                          <div className="space-y-2 pl-4 border-l-2 border-stone-100">
                             {opt.choices.map((choice, cIdx) => (
                                <div key={cIdx} className="flex justify-between items-center text-sm group">
                                   <span>{choice.name} <span className="text-stone-400">({choice.price > 0 ? `+ ${settings.currencySymbol} ${choice.price.toFixed(2)}` : 'Grátis'})</span></span>
                                   <button onClick={() => removeChoiceFromOption(opt.id, cIdx, isAddingNew)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button>
                                </div>
                             ))}
                             <div className="flex gap-2 mt-2 items-center">
                                <input id={`new-choice-name-${opt.id}`} placeholder="Opção (Ex: Catupiry)" className="p-1 border rounded text-xs flex-1" />
                                <input id={`new-choice-price-${opt.id}`} type="number" placeholder="Preço" className="p-1 border rounded text-xs w-20" />
                                <button onClick={() => {
                                   const nameInput = document.getElementById(`new-choice-name-${opt.id}`) as HTMLInputElement;
                                   const priceInput = document.getElementById(`new-choice-price-${opt.id}`) as HTMLInputElement;
                                   addChoiceToOption(opt.id, nameInput.value, priceInput.value || '0', isAddingNew);
                                   nameInput.value = ''; priceInput.value = '';
                                }} className="text-xs bg-stone-200 px-2 py-1 rounded hover:bg-stone-300 font-bold">+</button>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

            </div>

            <div className="p-4 border-t border-stone-200 flex justify-end gap-2 bg-stone-50 sticky bottom-0 z-10">
               <button onClick={() => { setIsAddingNew(false); setEditingProduct(null); }} className="px-6 py-3 text-stone-500 font-bold hover:text-stone-800">Cancelar</button>
               <button onClick={isAddingNew ? handleAddNewProduct : saveEdit} className="bg-italian-green text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg">
                  {isAddingNew ? 'Criar Produto' : 'Salvar Alterações'}
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
