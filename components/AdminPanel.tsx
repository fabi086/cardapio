

import React, { useState, useEffect, useMemo } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice, Order, Coupon, DeliveryRegion, WeeklySchedule, Table } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Ticket, QrCode, Clock, CreditCard, LayoutDashboard, ShoppingBag, Palette, Phone, Share2, Calendar, Printer, Filter, ChevronDown, ChevronUp, AlertTriangle, User, Truck, Utensils, Minus, Type, Ban, Wifi, WifiOff, Loader2, Database, Globe, DollarSign, Sun, Moon, Instagram, Facebook, Youtube, Store } from 'lucide-react';
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
  const [orderViewMode, setOrderViewMode] = useState<'list' | 'dining'>('list');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<number | null>(null);
  
  // Order Edit State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderEditForm, setOrderEditForm] = useState<{items: any[], total: number}>({ items: [], total: 0 });
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

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

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

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
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);

  // Custom Date Range State
  const [customDashStart, setCustomDashStart] = useState('');
  const [customDashEnd, setCustomDashEnd] = useState('');
  const [orderFilterStart, setOrderFilterStart] = useState('');
  const [orderFilterEnd, setOrderFilterEnd] = useState('');

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

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderEditForm({
      items: order.items ? JSON.parse(JSON.stringify(order.items)) : [],
      total: order.total
    });
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = [...orderEditForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    recalculateOrderTotal(updatedItems);
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = orderEditForm.items.filter((_, i) => i !== index);
    recalculateOrderTotal(updatedItems);
  };

  const addNewItemToOrder = () => {
    if (!newItemName || !newItemPrice) return;
    const newItem = { name: newItemName, price: parseFloat(newItemPrice), quantity: 1, selectedOptions: [], observation: 'Adicionado pelo Admin' };
    const updatedItems = [...orderEditForm.items, newItem];
    recalculateOrderTotal(updatedItems);
    setNewItemName('');
    setNewItemPrice('');
  };

  const recalculateOrderTotal = (items: any[]) => {
    const subtotal = items.reduce((acc, item) => {
      const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((sum: number, opt: any) => sum + opt.price, 0) : 0;
      return acc + ((item.price + optionsPrice) * item.quantity);
    }, 0);
    const fee = editingOrder?.delivery_fee || 0;
    const discount = editingOrder?.discount || 0;
    const newTotal = Math.max(0, (subtotal + fee) - discount);
    setOrderEditForm({ items, total: newTotal });
  };

  const saveOrderChanges = async () => {
    if (!editingOrder) return;
    const updatedOrder = { ...editingOrder, items: orderEditForm.items, total: orderEditForm.total };
    setOrders(prev => prev.map(o => o.id === editingOrder.id ? updatedOrder : o));
    if (supabase) {
      const { error } = await supabase.from('orders').update({ items: orderEditForm.items, total: orderEditForm.total }).eq('id', editingOrder.id);
      if (error) alert('Erro ao salvar no banco de dados, mas atualizado localmente: ' + error.message);
    }
    setEditingOrder(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') setIsAuthenticated(true);
    else alert('Senha incorreta');
  };

  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const filteredOrders = orders.filter(order => {
       const orderDate = new Date(order.created_at);
       if (dashboardPeriod === 'today') return orderDate.toDateString() === now.toDateString();
       if (dashboardPeriod === 'week') { const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); return orderDate >= weekAgo; }
       if (dashboardPeriod === 'month') { const monthAgo = new Date(); monthAgo.setMonth(now.getMonth() - 1); return orderDate >= monthAgo; }
       if (dashboardPeriod === 'custom' && customDashStart && customDashEnd) {
           const start = new Date(customDashStart); start.setHours(0,0,0,0);
           const end = new Date(customDashEnd); end.setHours(23,59,59,999);
           return orderDate >= start && orderDate <= end;
       }
       return true;
    });
    const totalRevenue = filteredOrders.reduce((acc, order) => acc + (order.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const productCounts: Record<string, number> = {};
    filteredOrders.forEach(order => {
       if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => { productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1); });
       }
    });
    const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
    return { totalRevenue, totalOrders, topProducts, filteredOrders };
  }, [orders, dashboardPeriod, customDashStart, customDashEnd]);

  // --- IMAGE HANDLING ---
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
          console.error('Settings save error:', e);
          let msg = 'Erro desconhecido';
          
          if (e instanceof Error) {
             msg = e.message;
          } else if (typeof e === 'object' && e !== null) {
             msg = e.message || e.error_description || JSON.stringify(e);
             if (msg === '{}') msg = String(e);
          } else {
             msg = String(e);
          }
          
          if (msg.includes('Could not find the') && msg.includes('column')) {
             msg = `ERRO DE BANCO DE DADOS: Faltam colunas novas (ex: free_shipping, instagram). Copie o código SQL fornecido na conversa e rode no SQL Editor do Supabase. Detalhe: ${msg}`;
          }
          
          alert('Erro ao salvar configurações: ' + msg);
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
      if (supabase) { 
          const payload: any = { ...couponForm, code: couponForm.code.toUpperCase().trim(), discount_value: Number(couponForm.discount_value) }; 
          if (!payload.min_order_value) payload.min_order_value = 0; 
          
          if (editingCouponId) { 
              const { error } = await supabase.from('coupons').update(payload).eq('id', editingCouponId); 
              if (!error) { alert('Cupom atualizado com sucesso!'); cancelEditCoupon(); fetchCoupons(); } else { alert('Erro ao atualizar cupom: ' + error.message); } 
          } else { 
              const { error } = await supabase.from('coupons').insert([payload]); 
              if (!error) { setCouponForm({ type: 'percent', active: true }); setIsAddingCoupon(false); fetchCoupons(); } else { alert('Erro ao criar cupom: ' + error.message); } 
          } 
      } 
  };
  
  const handleDeleteCoupon = async (id: number) => { if (window.confirm('Excluir cupom?')) { if (supabase) { await supabase.from('coupons').delete().eq('id', id); fetchCoupons(); } } };
  const handleAddTable = async () => { if (!newTableNumber) return; if (supabase) { const { error } = await supabase.from('tables').insert([{ number: newTableNumber, active: true }]); if(!error) { setNewTableNumber(''); fetchTables(); } } };
  const handleDeleteTable = async (id: number) => { if(window.confirm('Remover mesa?')) { if(supabase) { await supabase.from('tables').delete().eq('id', id); fetchTables(); } } };
  const getQrCodeUrl = (tableNum: string) => { const origin = window.location.origin + window.location.pathname; const url = `${origin}?mesa=${tableNum}`; return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`; };
  const printQrCode = (tableNum: string) => { const qrUrl = getQrCodeUrl(tableNum); const win = window.open('', '_blank'); if (win) { win.document.write(`<html><head><title>Mesa ${tableNum}</title></head><body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;"><h1 style="font-size: 40px; margin-bottom: 20px;">Mesa ${tableNum}</h1><img src="${qrUrl}" style="width: 400px; height: 400px;" /><p style="margin-top:20px; font-size: 20px;">Aponte a câmera do celular</p><script>window.print();</script></body></html>`); win.document.close(); } };

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

        {activeTab === 'orders' && (
           <div className="animate-in fade-in space-y-4">
              <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-stone-200">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                        <h2 className="font-bold text-lg flex items-center gap-2 text-stone-800"><ShoppingBag className="w-5 h-5"/> Pedidos</h2>
                        <div className="bg-stone-100 p-1 rounded-lg flex">
                            <button onClick={() => setOrderViewMode('list')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${orderViewMode === 'list' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}>Lista</button>
                            <button onClick={() => setOrderViewMode('dining')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${orderViewMode === 'dining' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}>Mesas</button>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar">
                        {['all', 'pending', 'preparing', 'delivery', 'completed'].map(status => (
                            <button key={status} onClick={() => setOrderFilter(status)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${orderFilter === status ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'preparing' ? 'Preparo' : status === 'delivery' ? 'Entrega' : 'Concluídos'}
                            </button>
                        ))}
                    </div>
                 </div>
              </div>
              
              {/* Order List */}
              <div className="grid gap-4">
                  {orders.filter(o => orderFilter === 'all' || o.status === orderFilter).map(order => (
                      <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 relative">
                          <div className="flex justify-between items-start mb-3">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-lg">#{order.id}</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                          {order.status === 'pending' ? 'Pendente' : order.status === 'preparing' ? 'Preparando' : order.status === 'delivery' ? 'Entregando' : order.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                      </span>
                                  </div>
                                  <p className="text-sm text-stone-600 font-bold">{order.customer_name}</p>
                                  <p className="text-xs text-stone-400">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                              </div>
                              <div className="text-right">
                                  <p className="font-bold text-lg">{settings.currencySymbol} {order.total.toFixed(2)}</p>
                                  <p className="text-xs text-stone-500">{order.payment_method}</p>
                              </div>
                          </div>
                          <div className="border-t border-stone-100 pt-3 mt-3">
                              {order.items.map((item: any, i: number) => (
                                  <p key={i} className="text-sm text-stone-600">
                                      <span className="font-bold">{item.quantity}x</span> {item.name}
                                  </p>
                              ))}
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                              <button onClick={() => handlePrintOrder(order)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"><Printer className="w-4 h-4" /></button>
                              {order.status !== 'completed' && order.status !== 'cancelled' && (
                                  <>
                                      {order.status === 'pending' && <button onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold">Aceitar</button>}
                                      {order.status === 'preparing' && <button onClick={() => handleUpdateOrderStatus(order.id, 'delivery')} className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm font-bold">Enviar</button>}
                                      {order.status === 'delivery' && <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-bold">Concluir</button>}
                                  </>
                              )}
                          </div>
                      </div>
                  ))}
                  {orders.length === 0 && <p className="text-center text-stone-400 py-8">Nenhum pedido encontrado.</p>}
              </div>
           </div>
        )}

        {activeTab === 'menu' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                 <h2 className="text-xl font-bold mb-4">Gerenciar Cardápio</h2>
                 <p className="text-stone-500 text-sm mb-4">Adicione, edite ou remova produtos e categorias.</p>
                 
                 <div className="flex gap-2">
                    <button onClick={() => setIsAddingNew(true)} className="bg-italian-green text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-green-700 transition-colors">
                       <Plus className="w-4 h-4" /> Novo Produto
                    </button>
                    <button onClick={() => { const name = prompt("Nome da nova categoria:"); if(name) onAddCategory(name); }} className="bg-white border border-stone-300 text-stone-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-stone-50 transition-colors">
                       <Grid className="w-4 h-4" /> Nova Categoria
                    </button>
                 </div>

                 {/* Product Form Overlay */}
                 {(isAddingNew || editingProduct !== null) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                       <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95">
                          <button onClick={() => { setIsAddingNew(false); setEditingProduct(null); }} className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full"><X className="w-6 h-6" /></button>
                          
                          <h3 className="text-xl font-bold mb-6">{isAddingNew ? 'Adicionar Produto' : 'Editar Produto'}</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-4">
                                <div><label className={LABEL_STYLE}>Nome</label><input value={isAddingNew ? newProductForm.name : editForm.name} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, name: e.target.value}) : setEditForm({...editForm, name: e.target.value})} className={INPUT_STYLE} /></div>
                                <div><label className={LABEL_STYLE}>Descrição</label><textarea value={isAddingNew ? newProductForm.description : editForm.description} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, description: e.target.value}) : setEditForm({...editForm, description: e.target.value})} className={INPUT_STYLE} rows={3} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div><label className={LABEL_STYLE}>Preço</label><input type="number" value={isAddingNew ? newProductForm.price : editForm.price} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, price: parseFloat(e.target.value)}) : setEditForm({...editForm, price: parseFloat(e.target.value)})} className={INPUT_STYLE} /></div>
                                   <div><label className={LABEL_STYLE}>Código (Opcional)</label><input value={isAddingNew ? newProductForm.code : editForm.code} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, code: e.target.value}) : setEditForm({...editForm, code: e.target.value})} className={INPUT_STYLE} /></div>
                                </div>
                                <div>
                                   <label className={LABEL_STYLE}>Categoria Principal</label>
                                   <select value={isAddingNew ? newProductForm.category : (editForm.category_id || '')} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, category: e.target.value}) : setEditForm({...editForm, category_id: e.target.value})} className={INPUT_STYLE}>
                                      {menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                   </select>
                                </div>
                                <div><label className={LABEL_STYLE}>Subcategoria (Agrupamento)</label><input value={isAddingNew ? newProductForm.subcategory : editForm.subcategory} onChange={e => isAddingNew ? setNewProductForm({...newProductForm, subcategory: e.target.value}) : setEditForm({...editForm, subcategory: e.target.value})} className={INPUT_STYLE} placeholder="Ex: Latas, Long Neck..." /></div>
                             </div>

                             <div className="space-y-4">
                                <div>
                                   <label className={LABEL_STYLE}>Imagem</label>
                                   <div className="flex items-center gap-4">
                                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, isAddingNew)} className="hidden" id="prod-img-upload" />
                                      <label htmlFor="prod-img-upload" className="w-24 h-24 bg-stone-100 border border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative">
                                         {(isAddingNew ? newProductForm.image : editForm.image) ? <img src={isAddingNew ? newProductForm.image : editForm.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-stone-400" />}
                                         {isProcessingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white"/></div>}
                                      </label>
                                      <div className="text-xs text-stone-500">Clique para alterar imagem.</div>
                                   </div>
                                </div>

                                <div>
                                   <label className={LABEL_STYLE}>Tags</label>
                                   <div className="flex flex-wrap gap-2">
                                      {[
                                         {id: 'popular', label: 'Popular', color: 'bg-yellow-100 text-yellow-800'},
                                         {id: 'vegetarian', label: 'Vegetariano', color: 'bg-green-100 text-green-800'},
                                         {id: 'spicy', label: 'Picante', color: 'bg-red-100 text-red-800'},
                                         {id: 'new', label: 'Novo', color: 'bg-blue-100 text-blue-800'}
                                      ].map(tag => {
                                         const currentTags = isAddingNew ? (newProductForm.tags || []) : (editForm.tags || []);
                                         const isActive = currentTags.includes(tag.id);
                                         const toggleTag = () => {
                                            const newTags = isActive ? currentTags.filter(t => t !== tag.id) : [...currentTags, tag.id];
                                            if(isAddingNew) setNewProductForm({...newProductForm, tags: newTags});
                                            else setEditForm({...editForm, tags: newTags});
                                         };
                                         return (
                                            <button key={tag.id} onClick={toggleTag} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isActive ? `${tag.color} border-transparent ring-2 ring-offset-1 ring-stone-300` : 'bg-white text-stone-500 border-stone-300'}`}>
                                               {tag.label}
                                            </button>
                                         );
                                      })}
                                   </div>
                                </div>

                                <div>
                                   <label className={LABEL_STYLE}>Categorias Adicionais</label>
                                   <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-stone-200 rounded-lg">
                                      {menuData.map(c => {
                                         if(c.id === (isAddingNew ? newProductForm.category : editForm.category_id)) return null;
                                         const currentAddCats = isAddingNew ? (newProductForm.additional_categories || []) : (editForm.additional_categories || []);
                                         const isActive = currentAddCats.includes(c.id);
                                         return (
                                            <button key={c.id} onClick={() => toggleAdditionalCategory(c.id, isAddingNew)} className={`px-2 py-1 text-xs rounded border ${isActive ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200'}`}>
                                               {c.name}
                                            </button>
                                         );
                                      })}
                                   </div>
                                </div>
                             </div>
                          </div>

                          {/* Options Management Section */}
                          <div className="mt-8 border-t border-stone-200 pt-6">
                             <h4 className="font-bold text-lg mb-4">Opções e Adicionais</h4>
                             
                             <div className="space-y-4 mb-6">
                                {currentOptions.map((opt, idx) => (
                                   <div key={opt.id} className="border border-stone-200 rounded-lg p-4 bg-stone-50">
                                      <div className="flex justify-between items-center mb-3">
                                         <div>
                                            <span className="font-bold text-sm">{opt.name}</span>
                                            <span className="text-xs ml-2 text-stone-500">({opt.type === 'single' ? 'Escolha Única' : 'Múltipla Escolha'})</span>
                                         </div>
                                         <button onClick={() => removeOptionFromForm(opt.id, isAddingNew)} className="text-red-500 hover:text-red-700 text-xs font-bold">Remover Grupo</button>
                                      </div>
                                      
                                      <div className="pl-4 border-l-2 border-stone-200 space-y-2">
                                         {opt.choices.map((choice, cIdx) => (
                                            <div key={cIdx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-stone-100">
                                               <span>{choice.name}</span>
                                               <div className="flex items-center gap-3">
                                                  <span className="font-bold text-stone-600">+ R$ {choice.price.toFixed(2)}</span>
                                                  <button onClick={() => removeChoiceFromOption(opt.id, cIdx, isAddingNew)} className="text-stone-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                               </div>
                                            </div>
                                         ))}
                                         <div className="flex gap-2 mt-2">
                                            <input id={`new-choice-name-${opt.id}`} placeholder="Nome da opção" className="flex-1 p-1.5 text-sm border rounded" />
                                            <input id={`new-choice-price-${opt.id}`} type="number" placeholder="Preço" className="w-20 p-1.5 text-sm border rounded" />
                                            <button onClick={() => {
                                               const nameInput = document.getElementById(`new-choice-name-${opt.id}`) as HTMLInputElement;
                                               const priceInput = document.getElementById(`new-choice-price-${opt.id}`) as HTMLInputElement;
                                               addChoiceToOption(opt.id, nameInput.value, priceInput.value || '0', isAddingNew);
                                               nameInput.value = ''; priceInput.value = '';
                                            }} className="bg-stone-200 text-stone-700 px-3 py-1 rounded text-xs font-bold hover:bg-stone-300">Add Opção</button>
                                         </div>
                                      </div>
                                   </div>
                                ))}
                             </div>

                             <div className="flex items-end gap-3 bg-stone-100 p-4 rounded-lg">
                                <div className="flex-1">
                                   <label className="text-xs font-bold text-stone-500 block mb-1">Novo Grupo de Opções</label>
                                   <input value={newOptionName} onChange={e => setNewOptionName(e.target.value)} placeholder="Ex: Escolha a Borda" className={INPUT_STYLE} />
                                </div>
                                <div className="w-40">
                                   <label className="text-xs font-bold text-stone-500 block mb-1">Tipo</label>
                                   <select value={newOptionType} onChange={e => setNewOptionType(e.target.value as any)} className={INPUT_STYLE}>
                                      <option value="single">Única (Radio)</option>
                                      <option value="multiple">Múltipla (Checkbox)</option>
                                   </select>
                                </div>
                                <button onClick={() => addOptionToForm(isAddingNew)} className="bg-stone-800 text-white px-4 py-3 rounded-lg font-bold h-[46px]">Criar Grupo</button>
                             </div>
                          </div>

                          <div className="mt-8 pt-6 border-t border-stone-200 flex justify-end gap-3">
                             <button onClick={() => { setIsAddingNew(false); setEditingProduct(null); }} className="px-6 py-3 rounded-lg text-stone-600 font-bold hover:bg-stone-100">Cancelar</button>
                             <button onClick={isAddingNew ? handleAddNewProduct : saveEdit} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg">
                                {isAddingNew ? 'Criar Produto' : 'Salvar Alterações'}
                             </button>
                          </div>
                       </div>
                    </div>
                 )}

                 {/* Categories & Products List */}
                 <div className="space-y-4 mt-6">
                    {menuData.map(cat => (
                       <div key={cat.id} className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                          <div 
                             className="bg-stone-50 p-4 flex justify-between items-center cursor-pointer hover:bg-stone-100 transition-colors"
                             onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                          >
                             <div className="flex items-center gap-3">
                                {expandedCategory === cat.id ? <ChevronUp className="w-5 h-5 text-stone-500"/> : <ChevronDown className="w-5 h-5 text-stone-500"/>}
                                <span className="font-bold text-lg">{cat.name}</span>
                                <span className="bg-stone-200 text-stone-600 text-xs px-2 py-0.5 rounded-full font-bold">{cat.items.length}</span>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onUpdateCategory(cat.id, { name: prompt('Novo nome:', cat.name) || cat.name }); }} className="p-2 hover:bg-white rounded-full text-stone-500"><Edit3 className="w-4 h-4"/></button>
                                <button onClick={(e) => { e.stopPropagation(); if(confirm('Apagar categoria?')) onDeleteCategory(cat.id); }} className="p-2 hover:bg-white rounded-full text-stone-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                             </div>
                          </div>
                          
                          {expandedCategory === cat.id && (
                             <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-stone-200 animate-in slide-in-from-top-2">
                                {cat.items.map(product => (
                                   <div key={product.id} className="flex gap-3 p-3 border border-stone-100 rounded-lg hover:shadow-md transition-shadow bg-white">
                                      <div className="w-16 h-16 bg-stone-100 rounded-md shrink-0 overflow-hidden">
                                         {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300"><ImageIcon className="w-6 h-6"/></div>}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <p className="font-bold text-stone-800 truncate">{product.name}</p>
                                         <p className="text-sm text-stone-500">{settings.currencySymbol} {product.price.toFixed(2)}</p>
                                         <div className="flex gap-2 mt-2">
                                            <button onClick={() => startEditing(product)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold">Editar</button>
                                            <button onClick={() => { if(confirm('Excluir produto?')) onDeleteProduct(cat.id, product.id); }} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-bold">Excluir</button>
                                         </div>
                                      </div>
                                   </div>
                                ))}
                                {cat.items.length === 0 && <p className="text-stone-400 text-sm italic p-2">Nenhum produto nesta categoria.</p>}
                             </div>
                          )}
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'coupons' && (
            <div className="space-y-6 animate-in fade-in">
               <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Ticket className="w-5 h-5"/> Gerenciar Cupons</h3>
                 
                 {!isAddingCoupon ? (
                     <>
                        <button onClick={() => setIsAddingCoupon(true)} className="bg-italian-green text-white px-4 py-2 rounded-lg font-bold text-sm mb-6 flex items-center gap-2">
                            <Plus className="w-4 h-4"/> Criar Cupom
                        </button>
                        <div className="space-y-3">
                            {coupons.map(coupon => (
                                <div key={coupon.id} className="flex justify-between items-center bg-stone-50 p-4 rounded-lg border border-stone-200">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-lg text-stone-800">{coupon.code}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{coupon.active ? 'Ativo' : 'Inativo'}</span>
                                        </div>
                                        <p className="text-sm text-stone-500">
                                            {coupon.type === 'percent' ? `${coupon.discount_value}% OFF` : 
                                             coupon.type === 'fixed' ? `R$ ${coupon.discount_value} OFF` : 'Frete Grátis'}
                                            {coupon.min_order_value ? ` (Mín: R$ ${coupon.min_order_value})` : ''}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditCoupon(coupon)} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit3 className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </>
                 ) : (
                     <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 max-w-lg">
                        <h4 className="font-bold mb-4">{editingCouponId ? 'Editar Cupom' : 'Novo Cupom'}</h4>
                        <div className="space-y-4">
                            <div><label className={LABEL_STYLE}>Código</label><input value={couponForm.code || ''} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} className={INPUT_STYLE} placeholder="EX: PROMO10" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL_STYLE}>Tipo</label>
                                    <select value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value as any})} className={INPUT_STYLE}>
                                        <option value="percent">Porcentagem (%)</option>
                                        <option value="fixed">Valor Fixo (R$)</option>
                                        <option value="free_shipping">Frete Grátis</option>
                                    </select>
                                </div>
                                <div><label className={LABEL_STYLE}>Valor</label><input type="number" value={couponForm.discount_value || ''} onChange={e => setCouponForm({...couponForm, discount_value: parseFloat(e.target.value)})} className={INPUT_STYLE} disabled={couponForm.type === 'free_shipping'} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={LABEL_STYLE}>Pedido Mínimo (R$)</label><input type="number" value={couponForm.min_order_value || ''} onChange={e => setCouponForm({...couponForm, min_order_value: parseFloat(e.target.value)})} className={INPUT_STYLE} /></div>
                                <div><label className={LABEL_STYLE}>Validade</label><input type="date" value={couponForm.end_date || ''} onChange={e => setCouponForm({...couponForm, end_date: e.target.value})} className={INPUT_STYLE} /></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={couponForm.active} onChange={e => setCouponForm({...couponForm, active: e.target.checked})} className="w-5 h-5 text-italian-green focus:ring-italian-green" />
                                <span className="font-bold text-stone-700">Ativo</span>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button onClick={cancelEditCoupon} className="px-4 py-2 text-stone-600 font-bold hover:bg-stone-200 rounded-lg">Cancelar</button>
                                <button onClick={handleSaveCoupon} className="bg-italian-green text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">Salvar</button>
                            </div>
                        </div>
                     </div>
                 )}
               </div>
            </div>
        )}

        {activeTab === 'tables' && (
           <div className="space-y-6 animate-in fade-in">
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-4">Gerenciar Mesas</h3>
                 <div className="flex gap-2 mb-6">
                    <input value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)} placeholder="Número/Nome da Mesa" className="p-2 border rounded-lg w-full max-w-xs" />
                    <button onClick={handleAddTable} className="bg-stone-800 text-white px-4 py-2 rounded-lg font-bold">Adicionar</button>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {tables.map(table => (
                       <div key={table.id} className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative group">
                          <span className="font-bold text-2xl text-stone-800 mb-2">{table.number}</span>
                          <div className="flex gap-2 mt-2">
                             <button onClick={() => printQrCode(table.number)} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="Imprimir QR"><QrCode className="w-4 h-4"/></button>
                             <button onClick={() => handleDeleteTable(table.id)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Remover"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-6 animate-in fade-in">
              
              {/* General Settings */}
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Settings className="w-5 h-5"/> Informações Gerais</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={LABEL_STYLE}>Nome da Loja</label><input value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className={INPUT_STYLE} /></div>
                    <div><label className={LABEL_STYLE}>WhatsApp (Somente Números)</label><input value={settingsForm.whatsapp} onChange={e => setSettingsForm({...settingsForm, whatsapp: e.target.value})} className={INPUT_STYLE} /></div>
                    <div className="col-span-1 md:col-span-2"><label className={LABEL_STYLE}>Endereço Completo</label><input value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} className={INPUT_STYLE} /></div>
                    
                    {/* Social Media Inputs - NEW SECTION */}
                    <div className="col-span-1 md:col-span-2 border-t border-stone-100 pt-4 mt-2">
                        <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Globe className="w-4 h-4" /> Redes Sociais (Links)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <Instagram className="w-5 h-5 text-pink-600" />
                                <input value={settingsForm.instagram || ''} onChange={e => setSettingsForm({...settingsForm, instagram: e.target.value})} className={INPUT_STYLE} placeholder="Link do Instagram" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Facebook className="w-5 h-5 text-blue-600" />
                                <input value={settingsForm.facebook || ''} onChange={e => setSettingsForm({...settingsForm, facebook: e.target.value})} className={INPUT_STYLE} placeholder="Link do Facebook" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Youtube className="w-5 h-5 text-red-600" />
                                <input value={settingsForm.youtube || ''} onChange={e => setSettingsForm({...settingsForm, youtube: e.target.value})} className={INPUT_STYLE} placeholder="Link do YouTube" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Store className="w-5 h-5 text-blue-500" />
                                <input value={settingsForm.googleBusiness || ''} onChange={e => setSettingsForm({...settingsForm, googleBusiness: e.target.value})} className={INPUT_STYLE} placeholder="Link Google Meu Negócio" />
                            </div>
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="col-span-1 border-t border-stone-100 pt-4 mt-2">
                       <label className={LABEL_STYLE}>Logo da Loja</label>
                       <div className="flex items-center gap-4">
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                          <label htmlFor="logo-upload" className="w-20 h-20 bg-stone-100 border border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-stone-200 overflow-hidden relative">
                             {settingsForm.logoUrl ? <img src={settingsForm.logoUrl} className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-stone-400" />}
                             {isProcessingLogo && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white"/></div>}
                          </label>
                          <div className="text-xs text-stone-500">Recomendado: 500x500px<br/>(Fundo Transparente)</div>
                       </div>
                    </div>

                    <div className="col-span-1 border-t border-stone-100 pt-4 mt-2">
                       <label className={LABEL_STYLE}>Telefones Adicionais</label>
                       <div className="flex flex-wrap gap-2 mb-2">
                          {settingsForm.phones.map((phone, idx) => (
                             <span key={idx} className="bg-stone-100 border border-stone-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">{phone} <button onClick={() => handleRemovePhone(idx)}><X className="w-3 h-3 text-stone-500 hover:text-red-500"/></button></span>
                          ))}
                       </div>
                       <div className="flex gap-2"><input value={newPhone} onChange={e => setNewPhone(e.target.value)} className={INPUT_STYLE} placeholder="Novo telefone" /><button onClick={handleAddPhone} className="bg-stone-800 text-white px-4 rounded-lg font-bold">Add</button></div>
                    </div>
                 </div>
              </div>

              {/* Schedule Settings */}
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Clock className="w-5 h-5"/> Horários de Funcionamento</h3>
                 <div className="space-y-4">
                    {WEEKDAYS_ORDER.map((dayKey) => {
                       const schedule = settingsForm.schedule || {} as WeeklySchedule;
                       const daySchedule = schedule[dayKey as keyof WeeklySchedule] || { isOpen: false, intervals: [] };
                       const interval = daySchedule.intervals && daySchedule.intervals.length > 0 ? daySchedule.intervals[0] : { start: '18:00', end: '23:00' };

                       return (
                          <div key={dayKey} className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border ${daySchedule.isOpen ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-200 opacity-75'}`}>
                             <div className="flex items-center gap-3 mb-2 md:mb-0 min-w-[150px]">
                                <label className="relative inline-flex items-center cursor-pointer">
                                   <input 
                                     type="checkbox" 
                                     className="sr-only peer"
                                     checked={daySchedule.isOpen}
                                     onChange={(e) => handleScheduleUpdate(dayKey, 'isOpen', e.target.checked)}
                                   />
                                   <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-italian-red rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-italian-green"></div>
                                </label>
                                <span className={`font-bold ${daySchedule.isOpen ? 'text-stone-800' : 'text-stone-400'}`}>{WEEKDAYS_PT[dayKey as keyof typeof WEEKDAYS_PT]}</span>
                             </div>

                             {daySchedule.isOpen && (
                                <div className="flex items-center gap-2">
                                   <input 
                                     type="time" 
                                     value={interval.start} 
                                     onChange={(e) => handleScheduleUpdate(dayKey, 'start', e.target.value)}
                                     className="p-2 border border-stone-300 rounded text-sm bg-white text-stone-900 focus:ring-2 focus:ring-italian-red outline-none"
                                   />
                                   <span className="text-stone-400">até</span>
                                   <input 
                                     type="time" 
                                     value={interval.end} 
                                     onChange={(e) => handleScheduleUpdate(dayKey, 'end', e.target.value)}
                                     className="p-2 border border-stone-300 rounded text-sm bg-white text-stone-900 focus:ring-2 focus:ring-italian-red outline-none"
                                   />
                                </div>
                             )}
                             {!daySchedule.isOpen && <span className="text-sm text-stone-400 italic">Fechado</span>}
                          </div>
                       );
                    })}
                 </div>
              </div>

              {/* Delivery Settings */}
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><MapPin className="w-5 h-5"/> Taxas de Entrega</h3>
                 <div className="mb-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="checkbox" checked={settingsForm.freeShipping} onChange={e => setSettingsForm({...settingsForm, freeShipping: e.target.checked})} className="w-5 h-5 text-italian-red rounded focus:ring-italian-red" />
                       <span className="font-bold text-stone-700">Ativar Frete Grátis Global</span>
                    </label>
                 </div>
                 {/* ... region editor ... */}
                 <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-4">
                    <h4 className="font-bold text-sm mb-3">Adicionar Nova Região</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                       <input value={newRegionName} onChange={e => setNewRegionName(e.target.value)} className={INPUT_STYLE} placeholder="Nome (Ex: Centro)" />
                       <input value={newRegionPrice} onChange={e => setNewRegionPrice(e.target.value)} type="number" className={INPUT_STYLE} placeholder="Valor (0.00)" />
                       <input value={newRegionZips} onChange={e => setNewRegionZips(e.target.value)} className={INPUT_STYLE} placeholder="CEPs/Faixas (Ex: 13295-000, 13295...)" />
                       <input value={newRegionExclusions} onChange={e => setNewRegionExclusions(e.target.value)} className={INPUT_STYLE} placeholder="Excluir CEPs (Ex: 13295-999)" />
                       <input value={newRegionNeighborhoods} onChange={e => setNewRegionNeighborhoods(e.target.value)} className={`${INPUT_STYLE} md:col-span-2`} placeholder="Bairros (Separados por vírgula). Se vazio, usa o Nome da Região." />
                    </div>
                    <button onClick={handleAddRegion} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700">Adicionar Região</button>
                 </div>
                 <div className="space-y-2">
                    {settingsForm.deliveryRegions?.map(region => (
                       <div key={region.id} className="flex justify-between items-center bg-white p-3 border border-stone-200 rounded-lg">
                          <div>
                             <p className="font-bold text-stone-800">{region.name}</p>
                             <p className="text-xs text-stone-500">CEP: {region.zipRules?.join(', ') || 'Todos'} {region.zipExclusions?.length ? `(Exceto: ${region.zipExclusions.join(', ')})` : ''}</p>
                          </div>
                          <div className="flex items-center gap-4">
                             <span className="font-bold text-green-600">{settings.currencySymbol} {region.price.toFixed(2)}</span>
                             <button onClick={() => handleRemoveRegion(region.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Visual Settings - SEPARATE MODES */}
              <div className={CARD_STYLE}>
                 <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Palette className="w-5 h-5"/> Identidade Visual</h3>
                    <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
                       <button onClick={() => setColorTab('general')} className={`px-3 py-1 text-xs font-bold rounded transition-all ${colorTab === 'general' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>Geral</button>
                       <button onClick={() => setColorTab('light')} className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${colorTab === 'light' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}><Sun className="w-3 h-3"/> Modo Claro</button>
                       <button onClick={() => setColorTab('dark')} className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center gap-1 ${colorTab === 'dark' ? 'bg-stone-800 text-white shadow' : 'text-stone-500'}`}><Moon className="w-3 h-3"/> Modo Escuro</button>
                    </div>
                 </div>

                 {colorTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                        {/* Primary */}
                        <div>
                           <label className={LABEL_STYLE}>Cor Principal</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.primary || '#C8102E'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, primary: e.target.value} as any})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.primary || '#C8102E'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, primary: e.target.value} as any})} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Secondary */}
                        <div>
                           <label className={LABEL_STYLE}>Cor Secundária</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.secondary || '#008C45'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, secondary: e.target.value} as any})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.secondary || '#008C45'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, secondary: e.target.value} as any})} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Header BG */}
                         <div>
                           <label className={LABEL_STYLE}>Fundo do Cabeçalho</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.headerBackground || settingsForm.colors?.primary || '#C8102E'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, headerBackground: e.target.value} as any})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.headerBackground || ''} placeholder="Padrão: Principal" onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, headerBackground: e.target.value} as any})} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Header Text */}
                        <div>
                           <label className={LABEL_STYLE}>Texto do Cabeçalho</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.headerText || '#FFFFFF'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, headerText: e.target.value} as any})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.headerText || ''} placeholder="Padrão: Branco" onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, headerText: e.target.value} as any})} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Footer BG */}
                        <div>
                           <label className={LABEL_STYLE}>Fundo do Rodapé</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.footer || '#1c1917'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, footer: e.target.value} as any})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.footer || ''} placeholder="Padrão: Escuro" onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, footer: e.target.value} as any})} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Footer Text */}
                        <div>
                           <label className={LABEL_STYLE}>Texto do Rodapé</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.footerText || '#a8a29e'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, footerText: e.target.value} as any})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.footerText || ''} placeholder="Padrão: Cinza" onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, footerText: e.target.value} as any})} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Buttons Color */}
                        <div>
                           <label className={LABEL_STYLE}>Cor dos Botões</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.buttons || settingsForm.colors?.primary || '#C8102E'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, buttons: e.target.value} as any})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.buttons || ''} placeholder="Padrão: Principal" onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, buttons: e.target.value} as any})} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Cart Color */}
                        <div>
                           <label className={LABEL_STYLE}>Cor do Carrinho</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.cart || settingsForm.colors?.secondary || '#008C45'} onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, cart: e.target.value} as any})} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.cart || ''} placeholder="Padrão: Secundária" onChange={e => setSettingsForm({...settingsForm, colors: {...settingsForm.colors, cart: e.target.value} as any})} className={INPUT_STYLE} />
                           </div>
                        </div>
                    </div>
                 )}
                 {(colorTab === 'light' || colorTab === 'dark') && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                        {/* Background */}
                        <div>
                           <label className={LABEL_STYLE}>Fundo da Página</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.modes?.[colorTab]?.background || '#ffffff'} 
                                onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], background: e.target.value }
                                        }
                                    }
                                })} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.modes?.[colorTab]?.background || ''} onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], background: e.target.value }
                                        }
                                    }
                                })} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Card Background */}
                        <div>
                           <label className={LABEL_STYLE}>Fundo dos Cards</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.modes?.[colorTab]?.cardBackground || '#ffffff'} 
                                onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], cardBackground: e.target.value }
                                        }
                                    }
                                })} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.modes?.[colorTab]?.cardBackground || ''} onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], cardBackground: e.target.value }
                                        }
                                    }
                                })} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Text Body */}
                        <div>
                           <label className={LABEL_STYLE}>Texto Principal</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.modes?.[colorTab]?.text || '#000000'} 
                                onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], text: e.target.value }
                                        }
                                    }
                                })} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.modes?.[colorTab]?.text || ''} onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], text: e.target.value }
                                        }
                                    }
                                })} className={INPUT_STYLE} />
                           </div>
                        </div>
                        {/* Text Card */}
                         <div>
                           <label className={LABEL_STYLE}>Texto dos Cards</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.modes?.[colorTab]?.cardText || '#000000'} 
                                onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], cardText: e.target.value }
                                        }
                                    }
                                })} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.modes?.[colorTab]?.cardText || ''} onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], cardText: e.target.value }
                                        }
                                    }
                                })} className={INPUT_STYLE} />
                           </div>
                        </div>
                         {/* Border */}
                         <div>
                           <label className={LABEL_STYLE}>Bordas / Divisórias</label>
                           <div className="flex gap-2">
                              <input type="color" value={settingsForm.colors?.modes?.[colorTab]?.border || '#e5e5e5'} 
                                onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], border: e.target.value }
                                        }
                                    }
                                })} className="h-10 w-10 rounded cursor-pointer border-0" />
                              <input value={settingsForm.colors?.modes?.[colorTab]?.border || ''} onChange={e => setSettingsForm({
                                    ...settingsForm, 
                                    colors: {
                                        ...settingsForm.colors!,
                                        modes: {
                                            ...settingsForm.colors?.modes!,
                                            [colorTab]: { ...settingsForm.colors?.modes?.[colorTab], border: e.target.value }
                                        }
                                    }
                                })} className={INPUT_STYLE} />
                           </div>
                        </div>
                     </div>
                 )}
              </div>

              {/* SEO & Sharing */}
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-stone-100 pb-2"><Share2 className="w-5 h-5"/> SEO & Compartilhamento</h3>
                 <div className="space-y-4">
                    <div><label className={LABEL_STYLE}>Título da Página</label><input value={settingsForm.seoTitle || settingsForm.name} onChange={e => setSettingsForm({...settingsForm, seoTitle: e.target.value})} className={INPUT_STYLE} /></div>
                    <div><label className={LABEL_STYLE}>Descrição Curta</label><textarea value={settingsForm.seoDescription || ''} onChange={e => setSettingsForm({...settingsForm, seoDescription: e.target.value})} className={INPUT_STYLE} rows={2} /></div>
                    
                    <div>
                       <label className={LABEL_STYLE}>Banner de Compartilhamento</label>
                       <div className="flex items-center gap-4 bg-stone-50 p-3 rounded-lg border border-stone-200">
                          <div className="shrink-0">
                             <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" id="banner-upload" />
                             <label htmlFor="banner-upload" className="w-40 h-24 bg-stone-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-stone-300 transition-colors overflow-hidden relative">
                                {settingsForm.seoBannerUrl ? <img src={settingsForm.seoBannerUrl} className="w-full h-full object-cover" /> : <span className="text-xs text-stone-500">Sem Imagem</span>}
                                {isProcessingBanner && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white"/></div>}
                             </label>
                          </div>
                          <div>
                             <p className="text-xs text-stone-500">Recomendado: 1200x630px.</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Save Button */}
              <div className="sticky bottom-6 flex justify-end">
                 <button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition-transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSavingSettings ? <Loader2 className="w-6 h-6 animate-spin"/> : <Save className="w-6 h-6" />}
                    {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
                 </button>
              </div>

           </div>
        )}

      </main>
    </div>
  );
};
