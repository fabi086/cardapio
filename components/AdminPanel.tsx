


import React, { useState, useEffect, useMemo } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice, Order, Coupon, DeliveryRegion, WeeklySchedule, Table } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Ticket, QrCode, Clock, CreditCard, LayoutDashboard, ShoppingBag, Palette, Phone, Share2, Calendar, Printer, Filter, ChevronDown, ChevronUp, AlertTriangle, User, Truck, Utensils, Minus, Type, Ban, Wifi, WifiOff, Loader2, Database, Globe, DollarSign, Sun, Moon, Instagram, Facebook, Youtube, Store, Edit, Brush } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'coupons' | 'tables' | 'settings'>('dashboard');
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
  
  // -- NEW: Order Editing State --
  const [editingOrderContent, setEditingOrderContent] = useState<Order | null>(null);
  const [productToAddId, setProductToAddId] = useState<string>('');
  
  // Menu State
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ 
    category: menuData[0]?.id || '',
    image: '', price: 0, subcategory: '', ingredients: [], tags: [], additional_categories: []
  });

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
             setDbError(`Erro de conexão: ${error.message}`);
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
      alert('Erro ao atualizar status: ' + error.message);
    }
    setIsUpdatingOrder(null);
  };
  
  // -- NEW: Order Editing Functions --
  const handleRemoveItemFromOrder = (index: number) => {
    if (!editingOrderContent) return;
    const newItems = [...editingOrderContent.items];
    newItems.splice(index, 1);
    
    // Recalculate Total
    const subtotal = newItems.reduce((acc, item: any) => {
        const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((s:number, o:any) => s + o.price, 0) : 0;
        return acc + ((item.price + optionsPrice) * item.quantity);
    }, 0);
    
    // Re-apply discounts/fees logic minimally
    const delivery = editingOrderContent.delivery_fee || 0;
    const discount = editingOrderContent.discount || 0;
    const newTotal = Math.max(0, subtotal + delivery - discount);
    
    setEditingOrderContent({ ...editingOrderContent, items: newItems, total: newTotal });
  };

  const handleAddItemToOrder = () => {
    if (!editingOrderContent || !productToAddId) return;
    
    // Find product in menuData
    let foundProduct: Product | null = null;
    for (const cat of menuData) {
        const p = cat.items.find(i => i.id.toString() === productToAddId);
        if (p) { foundProduct = p; break; }
    }
    
    if (foundProduct) {
        const newItem = {
            id: foundProduct.id,
            name: foundProduct.name,
            price: foundProduct.price,
            quantity: 1,
            selectedOptions: [], // Simplified: adding without options for now
            observation: '',
            code: foundProduct.code
        };
        
        const newItems = [...editingOrderContent.items, newItem];
        
        // Recalculate Total
        const subtotal = newItems.reduce((acc, item: any) => {
            const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((s:number, o:any) => s + o.price, 0) : 0;
            return acc + ((item.price + optionsPrice) * item.quantity);
        }, 0);
        
        const delivery = editingOrderContent.delivery_fee || 0;
        const discount = editingOrderContent.discount || 0;
        const newTotal = Math.max(0, subtotal + delivery - discount);
        
        setEditingOrderContent({ ...editingOrderContent, items: newItems, total: newTotal });
        setProductToAddId(''); // Reset selector
    }
  };

  const handleSaveOrderContent = async () => {
    if (!editingOrderContent || !supabase) return;
    
    const { error } = await supabase.from('orders').update({
        items: editingOrderContent.items,
        total: editingOrderContent.total
    }).eq('id', editingOrderContent.id);
    
    if (error) {
        alert("Erro ao atualizar pedido: " + error.message);
    } else {
        fetchOrders();
        setEditingOrderContent(null);
    }
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
          console.error(e);
          const msg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
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
  const handleSaveCoupon = async () => { if (!couponForm.code || !couponForm.discount_value) return; if (supabase) { const payload: any = { ...couponForm, code: couponForm.code.toUpperCase().trim(), discount_value: Number(couponForm.discount_value) }; if (!payload.min_order_value) payload.min_order_value = 0; if (editingCouponId) { await supabase.from('coupons').update(payload).eq('id', editingCouponId); cancelEditCoupon(); fetchCoupons(); } else { await supabase.from('coupons').insert([payload]); setIsAddingCoupon(false); fetchCoupons(); } } };
  const handleDeleteCoupon = async (id: number) => { if (window.confirm('Excluir cupom?')) { if (supabase) { await supabase.from('coupons').delete().eq('id', id); fetchCoupons(); } } };
  
  const handleAddTable = async () => { if (!newTableNumber) return; if (supabase) { const { error } = await supabase.from('tables').insert([{ number: newTableNumber, active: true }]); if(!error) { setNewTableNumber(''); fetchTables(); } } };
  
  const handleDeleteTable = async (id: number) => { 
    if (!window.confirm('Tem certeza que deseja remover esta mesa?')) return;
    
    if (supabase) { 
        const { error } = await supabase.from('tables').delete().eq('id', id);
        
        if (error) {
            console.error("Erro ao excluir mesa:", error);
            alert("Erro ao excluir mesa. Verifique se existem pedidos vinculados a ela.");
        } else {
            // Success
            fetchTables(); 
        }
    } 
  };

  // --- NEW: Better QR Code Printing ---
  const getQrCodeUrl = (tableNum: string) => { 
      // Safe URL construction using current origin
      // Strip any existing query params to ensure clean link
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
                        // Wait for image to load before printing (2.5s delay)
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
    if (password === 'admin123') setIsAuthenticated(true);
    else alert('Senha incorreta');
  };

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
          <p className="text-stone-500 text-center mb-6 text-sm">Digite a senha para gerenciar o sistema</p>
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

  // Helper to filter orders based on active section
  const filteredOrders = orders.filter(o => {
      // Filter by Status first
      if (orderFilter !== 'all' && o.status !== orderFilter) return false;
      
      // Filter by Type (Section)
      if (activeOrderSection === 'tables') {
          return o.delivery_type === 'table';
      } else {
          return o.delivery_type !== 'table';
      }
  });

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
             {[{ id: 'dashboard', icon: LayoutDashboard, label: 'Dash' }, { id: 'orders', icon: ShoppingBag, label: 'Pedidos' }, { id: 'menu', icon: Grid, label: 'Cardápio' }, { id: 'coupons', icon: Ticket, label: 'Cupons' }, { id: 'tables', icon: QrCode, label: 'Mesas' }, { id: 'settings', icon: Settings, label: 'Config' }].map(tab => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-3 py-3 text-sm font-bold transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-italian-red text-italian-red' : 'border-transparent text-stone-500 hover:text-stone-800'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in fade-in">
              {/* ... existing dashboard content ... */}
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

        {/* Orders, Menu, Coupons, Tables - Kept as is, just truncated for brevity in output unless needed */}
        {/* ... (Orders Tab Logic) ... */}
        {/* ... (Menu Tab Logic) ... */}
        {/* ... (Coupons Tab Logic) ... */}
        {/* ... (Tables Tab Logic) ... */}
        
        {activeTab === 'orders' && (/* ... Same as existing ... */ <div className="animate-in fade-in space-y-4"><div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-stone-200"><div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3"><div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start"><h2 className="font-bold text-lg flex items-center gap-2 text-stone-800"><ShoppingBag className="w-5 h-5"/> Pedidos</h2><div className="bg-stone-100 p-1 rounded-lg flex"><button onClick={() => setActiveOrderSection('delivery')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeOrderSection === 'delivery' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}><Truck className="w-3 h-3"/> Delivery & Balcão</button><button onClick={() => setActiveOrderSection('tables')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeOrderSection === 'tables' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}><Utensils className="w-3 h-3"/> Mesas</button></div></div><div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar">{['all', 'pending', 'preparing', 'delivery', 'completed'].map(status => (<button key={status} onClick={() => setOrderFilter(status)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${orderFilter === status ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>{status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'preparing' ? 'Preparo' : status === 'delivery' ? 'Entrega' : 'Concluídos'}</button>))}</div></div></div><div className="grid gap-4">{filteredOrders.length > 0 ? (filteredOrders.map(order => (<div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border relative ${order.delivery_type === 'table' ? 'border-l-4 border-l-italian-green border-stone-200' : 'border-stone-200'}`}><div className="flex justify-between items-start mb-3"><div><div className="flex items-center gap-2"><span className="font-bold text-lg">#{order.id}</span><span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{order.status === 'pending' ? 'Pendente' : order.status === 'preparing' ? 'Preparando' : order.status === 'delivery' ? 'Entregando' : order.status === 'completed' ? 'Concluído' : 'Cancelado'}</span>{order.delivery_type === 'table' && (<span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 border border-green-200"><Utensils className="w-3 h-3" /> MESA {order.table_number}</span>)}</div><p className="text-sm text-stone-600 font-bold">{order.customer_name || 'Cliente'}</p><p className="text-xs text-stone-400">{new Date(order.created_at).toLocaleString('pt-BR')}</p></div><div className="text-right"><p className="font-bold text-lg">{settings.currencySymbol} {order.total.toFixed(2)}</p><p className="text-xs text-stone-500">{order.payment_method}</p></div></div><div className="border-t border-stone-100 pt-3 mt-3">{order.items.map((item: any, i: number) => (<p key={i} className="text-sm text-stone-600"><span className="font-bold">{item.quantity}x</span> {item.name}{item.selectedOptions && item.selectedOptions.length > 0 && (<span className="text-stone-400 text-xs block pl-4">+ {item.selectedOptions.map((o:any) => o.choiceName).join(', ')}</span>)}{item.observation && <span className="text-xs text-red-500 block pl-4 font-bold">OBS: {item.observation}</span>}</p>))}</div><div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditingOrderContent(order)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg" title="Editar Itens"><Edit className="w-4 h-4" /></button><button onClick={() => handlePrintOrder(order)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg" title="Imprimir"><Printer className="w-4 h-4" /></button>{order.status !== 'completed' && order.status !== 'cancelled' && (<>{order.status === 'pending' && <button onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold">Aceitar</button>}{order.status === 'preparing' && <button onClick={() => handleUpdateOrderStatus(order.id, 'delivery')} className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm font-bold">{order.delivery_type === 'table' ? 'Pronto' : 'Enviar'}</button>}{order.status === 'delivery' && <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-bold">Concluir</button>}</>)}</div></div>))) : (<div className="text-center py-12 bg-white rounded-xl border border-stone-200"><div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 text-stone-400 mb-3">{activeOrderSection === 'tables' ? <Utensils className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}</div><p className="text-stone-500 font-medium">Nenhum pedido de {activeOrderSection === 'tables' ? 'mesa' : 'delivery'} encontrado.</p></div>)}</div></div>)}
        {activeTab === 'menu' && (/* ... Same as existing ... */ <div className="space-y-6 animate-in fade-in"><div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200"><h2 className="text-xl font-bold mb-4">Gerenciar Cardápio</h2><p className="text-stone-500 text-sm mb-4">Adicione, edite ou remova produtos e categorias.</p><div className="flex gap-2"><button onClick={() => setIsAddingNew(true)} className="bg-italian-green text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-green-700 transition-colors"><Plus className="w-4 h-4" /> Novo Produto</button><button onClick={() => { const name = prompt("Nome da nova categoria:"); if(name) onAddCategory(name); }} className="bg-white border border-stone-300 text-stone-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-stone-50 transition-colors"><Grid className="w-4 h-4" /> Nova Categoria</button></div>{(isAddingNew || editingProduct !== null) && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"><div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95"><button onClick={() => { setIsAddingNew(false); setEditingProduct(null); }} className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full"><X className="w-6 h-6" /></button><h3 className="text-xl font-bold mb-6">{isAddingNew ? 'Adicionar Produto' : 'Editar Produto'}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-4"><div><label className={LABEL_STYLE}>Nome</label><input value={isAddingNew ? newProductForm.name : editForm.name} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, name: e.target.value}) : setEditForm({...editForm, name: e.target.value})} className={INPUT_STYLE} /></div><div><label className={LABEL_STYLE}>Descrição</label><textarea value={isAddingNew ? newProductForm.description : editForm.description} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, description: e.target.value}) : setEditForm({...editForm, description: e.target.value})} className={INPUT_STYLE} rows={3} /></div><div className="grid grid-cols-2 gap-4"><div><label className={LABEL_STYLE}>Preço</label><input type="number" value={isAddingNew ? newProductForm.price : editForm.price} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, price: parseFloat(e.target.value)}) : setEditForm({...editForm, price: parseFloat(e.target.value)})} className={INPUT_STYLE} /></div><div><label className={LABEL_STYLE}>Código (Opcional)</label><input value={isAddingNew ? newProductForm.code : editForm.code} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, code: e.target.value}) : setEditForm({...editForm, code: e.target.value})} className={INPUT_STYLE} /></div></div><div><label className={LABEL_STYLE}>Categoria Principal</label><select value={isAddingNew ? newProductForm.category : (editForm.category_id || '')} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, category: e.target.value}) : setEditForm({...editForm, category_id: e.target.value})} className={INPUT_STYLE}>{menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className={LABEL_STYLE}>Subcategoria (Agrupamento)</label><input value={isAddingNew ? newProductForm.subcategory : editForm.subcategory} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, subcategory: e.target.value}) : setEditForm({...editForm, subcategory: e.target.value})} className={INPUT_STYLE} placeholder="Ex: Latas, Long Neck..." /></div></div><div className="space-y-4"><div><label className={LABEL_STYLE}>Imagem</label><div className="flex items-center gap-4"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, isAddingNew)} className="hidden" id="prod-img-upload" /><label htmlFor="prod-img-upload" className="w-24 h-24 bg-stone-100 border border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative">{(isAddingNew ? newProductForm.image : editForm.image) ? <img src={isAddingNew ? newProductForm.image : editForm.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-stone-400" />}{isProcessingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white"/></div>}</label><div className="text-xs text-stone-500">Clique para alterar imagem.</div></div></div><div><label className={LABEL_STYLE}>Tags</label><div className="flex flex-wrap gap-2">{[{id: 'popular', label: 'Popular', color: 'bg-yellow-100 text-yellow-800'},{id: 'vegetarian', label: 'Vegetariano', color: 'bg-green-100 text-green-800'},{id: 'spicy', label: 'Picante', color: 'bg-red-100 text-red-800'},{id: 'new', label: 'Novo', color: 'bg-blue-100 text-blue-800'}].map(tag => { const currentTags = isAddingNew ? (newProductForm.tags || []) : (editForm.tags || []); const isActive = currentTags.includes(tag.id); const toggleTag = () => { const newTags = isActive ? currentTags.filter(t => t !== tag.id) : [...currentTags, tag.id]; if(isAddingNew) setNewProductForm({...newProductForm, tags: newTags}); else setEditForm({...editForm, tags: newTags}); }; return (<button key={tag.id} onClick={toggleTag} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isActive ? `${tag.color} border-transparent ring-2 ring-offset-1 ring-stone-300` : 'bg-white text-stone-500 border-stone-300'}`}>{tag.label}</button>); })}</div></div><div><label className={LABEL_STYLE}>Categorias Adicionais</label><div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-stone-200 rounded-lg">{menuData.map(c => { if(c.id === (isAddingNew ? newProductForm.category : editForm.category_id)) return null; const currentAddCats = isAddingNew ? (newProductForm.additional_categories || []) : (editForm.additional_categories || []); const isActive = currentAddCats.includes(c.id); return (<button key={c.id} onClick={() => toggleAdditionalCategory(c.id, isAddingNew)} className={`px-2 py-1 text-xs rounded border ${isActive ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200'}`}>{c.name}</button>); })}</div></div></div></div><div className="mt-8 border-t border-stone-200 pt-6"><h4 className="font-bold text-lg mb-4">Opções e Adicionais</h4><div className="space-y-4 mb-6">{currentOptions.map((opt, idx) => (<div key={opt.id} className="border border-stone-200 rounded-lg p-4 bg-stone-50"><div className="flex justify-between items-center mb-3"><div><span className="font-bold text-sm">{opt.name}</span><span className="text-xs ml-2 text-stone-500">({opt.type === 'single' ? 'Escolha Única' : 'Múltipla Escolha'})</span></div><button onClick={() => removeOptionFromForm(opt.id, isAddingNew)} className="text-red-500 hover:text-red-700 text-xs font-bold">Remover Grupo</button></div><div className="pl-4 border-l-2 border-stone-200 space-y-2">{opt.choices.map((choice, cIdx) => (<div key={cIdx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-stone-100"><span>{choice.name}</span><div className="flex items-center gap-3"><span className="font-bold text-stone-600">+ R$ {choice.price.toFixed(2)}</span><button onClick={() => removeChoiceFromOption(opt.id, cIdx, isAddingNew)} className="text-stone-400 hover:text-red-500"><X className="w-3 h-3"/></button></div></div>))}<div className="flex gap-2 mt-2"><input id={`new-choice-name-${opt.id}`} placeholder="Nome da opção" className="flex-1 p-1.5 text-sm border rounded" /><input id={`new-choice-price-${opt.id}`} type="number" placeholder="Preço" className="w-20 p-1.5 text-sm border rounded" /><button onClick={() => { const nameInput = document.getElementById(`new-choice-name-${opt.id}`) as HTMLInputElement; const priceInput = document.getElementById(`new-choice-price-${opt.id}`) as HTMLInputElement; addChoiceToOption(opt.id, nameInput.value, priceInput.value || '0', isAddingNew); nameInput.value = ''; priceInput.value = ''; }} className="bg-stone-200 text-stone-700 px-3 py-1 rounded text-xs font-bold hover:bg-stone-300">Add Opção</button></div></div></div>))}</div><div className="flex items-end gap-3 bg-stone-100 p-4 rounded-lg"><div className="flex-1"><label className="text-xs font-bold text-stone-500 block mb-1">Novo Grupo de Opções</label><input value={newOptionName} onChange={e => setNewOptionName(e.target.value)} placeholder="Ex: Escolha a Borda" className={INPUT_STYLE} /></div><div className="w-40"><label className="text-xs font-bold text-stone-500 block mb-1">Tipo</label><select value={newOptionType} onChange={e => setNewOptionType(e.target.value as any)} className={INPUT_STYLE}><option value="single">Única (Radio)</option><option value="multiple">Múltipla (Checkbox)</option></select></div><button onClick={() => addOptionToForm(isAddingNew)} className="bg-stone-800 text-white px-4 py-3 rounded-lg font-bold h-[46px]">Criar Grupo</button></div></div><div className="mt-8 pt-6 border-t border-stone-200 flex justify-end gap-3"><button onClick={() => { setIsAddingNew(false); setEditingProduct(null); }} className="px-6 py-3 rounded-lg text-stone-600 font-bold hover:bg-stone-100">Cancelar</button><button onClick={isAddingNew ? handleAddNewProduct : saveEdit} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg">{isAddingNew ? 'Criar Produto' : 'Salvar Alterações'}</button></div></div></div>)}<div className="space-y-4 mt-6">{menuData.map(cat => (<div key={cat.id} className="border border-stone-200 rounded-xl overflow-hidden bg-white"><div className="bg-stone-50 p-4 flex justify-between items-center cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}><div className="flex items-center gap-3">{expandedCategory === cat.id ? <ChevronUp className="w-5 h-5 text-stone-500"/> : <ChevronDown className="w-5 h-5 text-stone-500"/>}<span className="font-bold text-lg">{cat.name}</span><span className="bg-stone-200 text-stone-600 text-xs px-2 py-0.5 rounded-full font-bold">{cat.items.length}</span></div><div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); onUpdateCategory(cat.id, { name: prompt('Novo nome:', cat.name) || cat.name }); }} className="p-2 hover:bg-white rounded-full text-stone-500"><Edit3 className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); if(confirm('Apagar categoria?')) onDeleteCategory(cat.id); }} className="p-2 hover:bg-white rounded-full text-stone-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div></div>{expandedCategory === cat.id && (<div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-stone-200 animate-in slide-in-from-top-2">{cat.items.map(product => (<div key={product.id} className="flex gap-3 p-3 border border-stone-100 rounded-lg hover:shadow-md transition-shadow bg-white"><div className="w-16 h-16 bg-stone-100 rounded-md shrink-0 overflow-hidden">{product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300"><ImageIcon className="w-6 h-6"/></div>}</div><div className="flex-1 min-w-0"><p className="font-bold text-stone-800 truncate">{product.name}</p><p className="text-sm text-stone-500">{settings.currencySymbol} {product.price.toFixed(2)}</p><div className="flex gap-2 mt-2"><button onClick={() => startEditing(product)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold">Editar</button><button onClick={() => { if(confirm('Excluir produto?')) onDeleteProduct(cat.id, product.id); }} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-bold">Excluir</button></div></div></div>))}{cat.items.length === 0 && <p className="text-stone-400 text-sm italic p-2">Nenhum produto nesta categoria.</p>}</div>)}</div>))}</div></div></div>)}
        {activeTab === 'coupons' && (/* ... Same as existing ... */ <div className="space-y-6 animate-in fade-in"><div className={CARD_STYLE}><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Ticket className="w-5 h-5"/> Gerenciar Cupons</h3>{!isAddingCoupon ? (<><button onClick={() => setIsAddingCoupon(true)} className="bg-italian-green text-white px-4 py-2 rounded-lg font-bold text-sm mb-6 flex items-center gap-2"><Plus className="w-4 h-4"/> Criar Cupom</button><div className="space-y-3">{coupons.map(coupon => (<div key={coupon.id} className="flex justify-between items-center bg-stone-50 p-4 rounded-lg border border-stone-200"><div><div className="flex items-center gap-3"><span className="font-bold text-lg text-stone-800">{coupon.code}</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{coupon.active ? 'Ativo' : 'Inativo'}</span></div><p className="text-sm text-stone-500">{coupon.type === 'percent' ? `${coupon.discount_value}% OFF` : coupon.type === 'fixed' ? `R$ ${coupon.discount_value} OFF` : 'Frete Grátis'}{coupon.min_order_value ? ` (Mín: R$ ${coupon.min_order_value})` : ''}</p></div><div className="flex gap-2"><button onClick={() => handleEditCoupon(coupon)} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit3 className="w-4 h-4"/></button><button onClick={() => handleDeleteCoupon(coupon.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button></div></div>))}</div></>) : (<div className="bg-stone-50 p-4 rounded-lg border border-stone-200 max-w-lg"><h4 className="font-bold mb-4">{editingCouponId ? 'Editar Cupom' : 'Novo Cupom'}</h4><div className="space-y-4"><div><label className={LABEL_STYLE}>Código</label><input value={couponForm.code || ''} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} className={INPUT_STYLE} placeholder="EX: PROMO10" /></div><div className="grid grid-cols-2 gap-4"><div><label className={LABEL_STYLE}>Tipo</label><select value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value as any})} className={INPUT_STYLE}><option value="percent">Porcentagem (%)</option><option value="fixed">Valor Fixo (R$)</option><option value="free_shipping">Frete Grátis</option></select></div><div><label className={LABEL_STYLE}>Valor</label><input type="number" value={couponForm.discount_value || ''} onChange={e => setCouponForm({...couponForm, discount_value: parseFloat(e.target.value)})} className={INPUT_STYLE} disabled={couponForm.type === 'free_shipping'} /></div></div><div className="grid grid-cols-2 gap-4"><div><label className={LABEL_STYLE}>Pedido Mínimo (R$)</label><input type="number" value={couponForm.min_order_value || ''} onChange={e => setCouponForm({...couponForm, min_order_value: parseFloat(e.target.value)})} className={INPUT_STYLE} /></div><div><label className={LABEL_STYLE}>Validade</label><input type="date" value={couponForm.end_date || ''} onChange={e => setCouponForm({...couponForm, end_date: e.target.value})} className={INPUT_STYLE} /></div></div><div className="flex items-center gap-2"><input type="checkbox" checked={couponForm.active} onChange={e => setCouponForm({...couponForm, active: e.target.checked})} className="w-5 h-5 text-italian-green focus:ring-italian-green" /><span className="font-bold text-stone-700">Ativo</span></div><div className="flex justify-end gap-2 pt-4"><button onClick={cancelEditCoupon} className="px-4 py-2 text-stone-600 font-bold hover:bg-stone-200 rounded-lg">Cancelar</button><button onClick={handleSaveCoupon} className="bg-italian-green text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">Salvar</button></div></div></div>)}</div></div>)}
        {activeTab === 'tables' && (/* ... Same as existing ... */ <div className="space-y-6 animate-in fade-in"><div className={CARD_STYLE}><h3 className="font-bold text-lg mb-2">Gerenciar Mesas</h3><p className="text-sm text-stone-500 mb-6">Imprima o QR Code e cole na mesa. Quando o cliente escanear, o pedido será vinculado automaticamente à mesa.</p><div className="flex gap-2 mb-6"><input value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)} placeholder="Número/Nome da Mesa" className="p-2 border rounded-lg w-full max-w-xs" /><button onClick={handleAddTable} className="bg-stone-800 text-white px-4 py-2 rounded-lg font-bold">Adicionar</button></div><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{tables.map(table => (<div key={table.id} className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative group hover:shadow-md transition-all"><span className="font-bold text-2xl text-stone-800 mb-2">{table.number}</span><div className="flex gap-2 mt-2"><button onClick={() => printQrCode(table.number)} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="Imprimir Plaquinha"><QrCode className="w-4 h-4"/></button><button onClick={() => handleDeleteTable(table.id)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Remover"><Trash2 className="w-4 h-4"/></button></div></div>))}</div>{tables.length === 0 && (<p className="text-center text-stone-400 py-8 italic">Nenhuma mesa cadastrada.</p>)}</div></div>)}

        {/* --- SETTINGS TAB RECONSTRUCTION --- */}
        {activeTab === 'settings' && (
           <div className="space-y-6 animate-in fade-in">
              
              {/* SECTION 1: GENERAL INFO */}
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
                 </div>
              </div>

              {/* SECTION 2: VISUAL IDENTITY */}
              <div className={CARD_STYLE}>
                  <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Palette className="w-5 h-5"/> Identidade Visual</h3>
                  
                  {/* Images Upload */}
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
                          <label className={LABEL_STYLE}>Favicon (Ícone da Aba)</label>
                          <div className="flex items-center gap-4">
                              <label className="w-16 h-16 bg-stone-100 border border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative shadow-inner">
                                  {settingsForm.faviconUrl ? <img src={settingsForm.faviconUrl} className="w-8 h-8 object-contain" /> : <Globe className="w-8 h-8 text-stone-400" />}
                                  <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" />
                                  {isProcessingFavicon && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-white"/></div>}
                              </label>
                              <div className="flex flex-col gap-2">
                                  {settingsForm.faviconUrl && <button onClick={() => setSettingsForm({...settingsForm, faviconUrl: ''})} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded font-bold hover:bg-red-100 flex items-center gap-1"><Trash2 className="w-3 h-3"/> Remover</button>}
                              </div>
                          </div>
                      </div>

                      <div>
                           <label className={LABEL_STYLE}>Capa (Banner SEO)</label>
                           <div className="flex items-center gap-4">
                              <label className="w-full h-24 bg-stone-100 border border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative shadow-inner">
                                  {settingsForm.seoBannerUrl ? <img src={settingsForm.seoBannerUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-stone-400" />}
                                  <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                                  {isProcessingBanner && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white"/></div>}
                              </label>
                              {settingsForm.seoBannerUrl && <button onClick={() => setSettingsForm({...settingsForm, seoBannerUrl: ''})} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded font-bold hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>}
                           </div>
                      </div>
                  </div>

                  {/* Colors Management */}
                  <div className="border-t border-stone-100 pt-6">
                      <h4 className="font-bold text-md mb-4 flex items-center gap-2 text-stone-600"><Brush className="w-4 h-4"/> Cores do Sistema</h4>
                      
                      <div className="flex gap-2 mb-4 bg-stone-50 p-1 rounded-lg w-fit">
                          <button onClick={() => setColorTab('general')} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${colorTab === 'general' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}>Principais</button>
                          <button onClick={() => setColorTab('light')} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${colorTab === 'light' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}>Modo Claro</button>
                          <button onClick={() => setColorTab('dark')} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${colorTab === 'dark' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}>Modo Escuro</button>
                      </div>

                      {colorTab === 'general' && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
                              <div><label className="text-xs font-bold text-stone-500 block mb-1">Cor Primária</label><div className="flex gap-2"><input type="color" value={settingsForm.colors?.primary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, primary: e.target.value}})} className="h-10 w-10 rounded cursor-pointer border-0" /><input value={settingsForm.colors?.primary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, primary: e.target.value}})} className={INPUT_STYLE} /></div></div>
                              <div><label className="text-xs font-bold text-stone-500 block mb-1">Cor Secundária</label><div className="flex gap-2"><input type="color" value={settingsForm.colors?.secondary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, secondary: e.target.value}})} className="h-10 w-10 rounded cursor-pointer border-0" /><input value={settingsForm.colors?.secondary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, secondary: e.target.value}})} className={INPUT_STYLE} /></div></div>
                              <div><label className="text-xs font-bold text-stone-500 block mb-1">Cor Botões</label><div className="flex gap-2"><input type="color" value={settingsForm.colors?.buttons || settingsForm.colors?.primary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, buttons: e.target.value}})} className="h-10 w-10 rounded cursor-pointer border-0" /><input value={settingsForm.colors?.buttons} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, buttons: e.target.value}})} className={INPUT_STYLE} /></div></div>
                              <div><label className="text-xs font-bold text-stone-500 block mb-1">Cor Carrinho</label><div className="flex gap-2"><input type="color" value={settingsForm.colors?.cart || settingsForm.colors?.secondary} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, cart: e.target.value}})} className="h-10 w-10 rounded cursor-pointer border-0" /><input value={settingsForm.colors?.cart} onChange={(e) => setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, cart: e.target.value}})} className={INPUT_STYLE} /></div></div>
                          </div>
                      )}

                      {(colorTab === 'light' || colorTab === 'dark') && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
                              {/* Background */}
                              <div>
                                  <label className="text-xs font-bold text-stone-500 block mb-1">Fundo da Página</label>
                                  <div className="flex gap-2">
                                      <input type="color" value={settingsForm.colors?.modes?.[colorTab].background} onChange={(e) => {
                                          const newModes = { ...settingsForm.colors!.modes! };
                                          newModes[colorTab].background = e.target.value;
                                          setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: newModes}});
                                      }} className="h-10 w-10 rounded cursor-pointer border-0" />
                                  </div>
                              </div>
                              {/* Card BG */}
                              <div>
                                  <label className="text-xs font-bold text-stone-500 block mb-1">Fundo Cartão</label>
                                  <div className="flex gap-2">
                                      <input type="color" value={settingsForm.colors?.modes?.[colorTab].cardBackground} onChange={(e) => {
                                          const newModes = { ...settingsForm.colors!.modes! };
                                          newModes[colorTab].cardBackground = e.target.value;
                                          setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: newModes}});
                                      }} className="h-10 w-10 rounded cursor-pointer border-0" />
                                  </div>
                              </div>
                              {/* Text */}
                              <div>
                                  <label className="text-xs font-bold text-stone-500 block mb-1">Cor do Texto</label>
                                  <div className="flex gap-2">
                                      <input type="color" value={settingsForm.colors?.modes?.[colorTab].text} onChange={(e) => {
                                          const newModes = { ...settingsForm.colors!.modes! };
                                          newModes[colorTab].text = e.target.value;
                                          setSettingsForm({...settingsForm, colors: {...settingsForm.colors!, modes: newModes}});
                                      }} className="h-10 w-10 rounded cursor-pointer border-0" />
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* SECTION 3: SOCIAL MEDIA */}
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Share2 className="w-5 h-5"/> Redes Sociais</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={LABEL_STYLE}><Instagram className="w-4 h-4 inline mr-1"/> Instagram URL</label>
                        <input value={settingsForm.instagram || ''} onChange={e => setSettingsForm({...settingsForm, instagram: e.target.value})} className={INPUT_STYLE} placeholder="https://instagram.com/..." />
                    </div>
                    <div>
                        <label className={LABEL_STYLE}><Facebook className="w-4 h-4 inline mr-1"/> Facebook URL</label>
                        <input value={settingsForm.facebook || ''} onChange={e => setSettingsForm({...settingsForm, facebook: e.target.value})} className={INPUT_STYLE} placeholder="https://facebook.com/..." />
                    </div>
                    <div>
                        <label className={LABEL_STYLE}><Youtube className="w-4 h-4 inline mr-1"/> YouTube URL</label>
                        <input value={settingsForm.youtube || ''} onChange={e => setSettingsForm({...settingsForm, youtube: e.target.value})} className={INPUT_STYLE} placeholder="https://youtube.com/..." />
                    </div>
                    <div>
                        <label className={LABEL_STYLE}><Store className="w-4 h-4 inline mr-1"/> Google Meu Negócio URL</label>
                        <input value={settingsForm.googleBusiness || ''} onChange={e => setSettingsForm({...settingsForm, googleBusiness: e.target.value})} className={INPUT_STYLE} placeholder="Link do Google Maps..." />
                    </div>
                 </div>
              </div>

              {/* SECTION 4: SCHEDULE & DELIVERY */}
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Truck className="w-5 h-5"/> Entregas & Horários</h3>
                 
                 <div className="mb-6">
                    <label className={LABEL_STYLE}>Horário de Funcionamento (Texto Simples)</label>
                    <input value={settingsForm.openingHours} onChange={e => setSettingsForm({...settingsForm, openingHours: e.target.value})} className={INPUT_STYLE} placeholder="Ex: Todos os dias das 18h às 23h" />
                 </div>

                 <div className="mb-6">
                     <h4 className="font-bold text-md mb-3 flex items-center gap-2 text-stone-700"><Calendar className="w-4 h-4"/> Horário Avançado (Automático)</h4>
                     <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                        {WEEKDAYS_ORDER.map(dayKey => {
                            const daySchedule = (settingsForm.schedule || {})[dayKey as keyof WeeklySchedule] || { isOpen: false, intervals: [] };
                            const interval = daySchedule.intervals[0] || { start: '18:00', end: '23:00' };
                            return (
                                <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border-b border-stone-200 last:border-0">
                                    <div className="flex items-center gap-3 min-w-[140px]">
                                        <input type="checkbox" checked={daySchedule.isOpen} onChange={e => handleScheduleUpdate(dayKey, 'isOpen', e.target.checked)} className="w-5 h-5 text-italian-green rounded" />
                                        <span className={`font-medium ${daySchedule.isOpen ? 'text-stone-800' : 'text-stone-400'}`}>{WEEKDAYS_PT[dayKey as keyof typeof WEEKDAYS_PT]}</span>
                                    </div>
                                    {daySchedule.isOpen && (
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={interval.start} onChange={e => handleScheduleUpdate(dayKey, 'start', e.target.value)} className="p-1 border border-stone-300 rounded text-sm bg-white text-stone-900 focus:ring-2 focus:ring-italian-red" />
                                            <span>até</span>
                                            <input type="time" value={interval.end} onChange={e => handleScheduleUpdate(dayKey, 'end', e.target.value)} className="p-1 border border-stone-300 rounded text-sm bg-white text-stone-900 focus:ring-2 focus:ring-italian-red" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                     </div>
                 </div>

                 {/* Delivery Regions */}
                 <div>
                    <h4 className="font-bold text-md mb-3 flex items-center gap-2 text-stone-700">Taxas de Entrega</h4>
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input value={newRegionName} onChange={e => setNewRegionName(e.target.value)} placeholder="Nome da Região" className={INPUT_STYLE} />
                          <input type="number" value={newRegionPrice} onChange={e => setNewRegionPrice(e.target.value)} placeholder="Preço (R$)" className={INPUT_STYLE} />
                          <input value={newRegionZips} onChange={e => setNewRegionZips(e.target.value)} placeholder="CEPs (separar por vírgula)" className={INPUT_STYLE} />
                          <input value={newRegionNeighborhoods} onChange={e => setNewRegionNeighborhoods(e.target.value)} placeholder="Bairros (separar por vírgula)" className={INPUT_STYLE} />
                       </div>
                       <button onClick={handleAddRegion} className="w-full bg-stone-800 text-white py-2 rounded-lg font-bold hover:bg-stone-900">Adicionar Região</button>
                       
                       <div className="space-y-2 mt-4">
                           {settingsForm.deliveryRegions?.map(region => (
                               <div key={region.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-stone-200">
                                   <div>
                                       <span className="font-bold text-stone-800">{region.name}</span>
                                       <span className="ml-2 text-green-600 font-bold">R$ {region.price.toFixed(2)}</span>
                                   </div>
                                   <button onClick={() => handleRemoveRegion(region.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                               </div>
                           ))}
                       </div>
                    </div>
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

      </main>

      {/* --- ORDER CONTENT EDIT MODAL --- */}
      {editingOrderContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  <div className="p-4 bg-stone-800 text-white flex justify-between items-center">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Edit3 className="w-5 h-5"/> Editar Itens do Pedido #{editingOrderContent.id}</h3>
                      <button onClick={() => setEditingOrderContent(null)} className="p-1 hover:bg-white/20 rounded-full"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto flex-1 bg-stone-50">
                      {/* Current Items List */}
                      <div className="space-y-2 mb-6">
                          <h4 className="text-xs font-bold text-stone-500 uppercase">Itens Atuais</h4>
                          {editingOrderContent.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-stone-200">
                                  <div>
                                      <p className="font-bold text-stone-800">{item.quantity}x {item.name}</p>
                                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                                         <p className="text-xs text-stone-500">{item.selectedOptions.map((o:any) => o.choiceName).join(', ')}</p>
                                      )}
                                      <p className="text-xs font-bold text-stone-400">R$ {((item.price + (item.selectedOptions?.reduce((s:number,o:any)=>s+o.price,0)||0)) * item.quantity).toFixed(2)}</p>
                                  </div>
                                  <button onClick={() => handleRemoveItemFromOrder(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                              </div>
                          ))}
                          {editingOrderContent.items.length === 0 && <p className="text-center text-stone-400 italic">Pedido sem itens.</p>}
                      </div>

                      {/* Add Item Section */}
                      <div className="bg-white p-4 rounded-lg border border-stone-200">
                          <h4 className="text-xs font-bold text-stone-500 uppercase mb-3">Adicionar Produto</h4>
                          <div className="flex gap-2">
                              <select value={productToAddId} onChange={(e) => setProductToAddId(e.target.value)} className={INPUT_STYLE}>
                                  <option value="">Selecione um produto...</option>
                                  {menuData.map(cat => (
                                      <optgroup key={cat.id} label={cat.name}>
                                          {cat.items.map(p => (
                                              <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                                          ))}
                                      </optgroup>
                                  ))}
                              </select>
                              <button onClick={handleAddItemToOrder} disabled={!productToAddId} className="bg-stone-800 text-white px-4 rounded-lg font-bold disabled:opacity-50">Adicionar</button>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 bg-white border-t border-stone-200">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-stone-500 text-sm">Novo Total Calculado:</span>
                          <span className="font-bold text-xl text-green-600">R$ {editingOrderContent.total.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-3 justify-end">
                          <button onClick={() => setEditingOrderContent(null)} className="px-4 py-2 text-stone-600 font-bold hover:bg-stone-100 rounded-lg">Cancelar</button>
                          <button onClick={handleSaveOrderContent} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md">Salvar Alterações</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};