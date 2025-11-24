import React, { useState, useEffect } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Layers, Megaphone, Tag, List, HelpCircle, Utensils } from 'lucide-react';

interface AdminPanelProps {
  menuData: Category[];
  settings: StoreSettings;
  onUpdateProduct: (categoryId: string, productId: number, updates: Partial<Product>) => void;
  onAddProduct: (categoryId: string, product: Omit<Product, 'id'>) => void;
  onDeleteProduct: (categoryId: string, productId: number) => void;
  onUpdateSettings: (settings: StoreSettings) => void;
  onResetMenu: () => void;
  onBack: () => void;
  onAddCategory?: (name: string) => void;
  onDeleteCategory?: (id: string) => void;
}

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
  onDeleteCategory
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'categories'>('menu');
  
  // Menu State
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ 
    category: menuData[0]?.id || 'pizzas-salgadas',
    image: '',
    price: 0,
    subcategory: '',
    ingredients: []
  });

  // Ingredient State
  const [tempIngredient, setTempIngredient] = useState('');

  // Promo State
  const [isManagingPromos, setIsManagingPromos] = useState(false);
  const [promoType, setPromoType] = useState<'existing' | 'manual'>('existing');
  const [selectedPromoId, setSelectedPromoId] = useState(''); // ID-CatID string combo
  const [promoPrice, setPromoPrice] = useState('');
  const [manualPromoForm, setManualPromoForm] = useState({ name: '', description: '', price: '', image: '' });

  // Settings State
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  
  // Region Management State
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionPrice, setNewRegionPrice] = useState('');
  const [newRegionZips, setNewRegionZips] = useState('');

  // Option Management State
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionType, setNewOptionType] = useState<'single' | 'multiple'>('single');

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { 
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta (Dica: admin123)');
    }
  };

  // --- INGREDIENTS HELPERS ---
  const addIngredientToNew = () => {
    if (tempIngredient.trim()) {
      setNewProductForm(prev => ({
        ...prev,
        ingredients: [...(prev.ingredients || []), tempIngredient.trim()]
      }));
      setTempIngredient('');
    }
  };

  const removeIngredientFromNew = (index: number) => {
    setNewProductForm(prev => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index)
    }));
  };

  const addIngredientToEdit = () => {
    if (tempIngredient.trim()) {
      setEditForm(prev => ({
        ...prev,
        ingredients: [...(prev.ingredients || []), tempIngredient.trim()]
      }));
      setTempIngredient('');
    }
  };

  const removeIngredientFromEdit = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index)
    }));
  };

  // --- PROMO ACTIONS ---
  const handleAddPromo = () => {
    if (promoType === 'existing') {
      if (!selectedPromoId || !promoPrice) {
        alert('Selecione um produto e defina o preço promocional.');
        return;
      }
      
      const [prodIdStr, catId] = selectedPromoId.split('|');
      const prodId = parseInt(prodIdStr);
      
      const category = menuData.find(c => c.id === catId);
      const product = category?.items.find(p => p.id === prodId);

      if (!product) return;

      onAddProduct('promocoes', {
        name: `PROMO: ${product.name}`,
        description: product.description,
        price: parseFloat(promoPrice.replace(',', '.')),
        category: 'promocoes',
        image: product.image,
        code: product.code,
        options: product.options, // Copy options/customizations
        ingredients: product.ingredients
      });

    } else {
      // Manual
      if (!manualPromoForm.name || !manualPromoForm.price) {
        alert('Preencha nome e preço.');
        return;
      }

      onAddProduct('promocoes', {
        name: manualPromoForm.name,
        description: manualPromoForm.description,
        price: parseFloat(manualPromoForm.price.replace(',', '.')),
        category: 'promocoes',
        image: manualPromoForm.image,
      });
    }

    alert('Promoção adicionada!');
    setIsManagingPromos(false);
    setPromoPrice('');
    setSelectedPromoId('');
    setManualPromoForm({ name: '', description: '', price: '', image: '' });
  };

  const handleManualPromoImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualPromoForm({ ...manualPromoForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- MENU ACTIONS ---
  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setEditForm(JSON.parse(JSON.stringify(product))); // Deep copy to avoid mutating refs
    setTempIngredient(''); // Reset temp input
  };

  const saveEdit = (originalCategoryId: string) => {
    if (editingProduct && editForm) {
      onUpdateProduct(originalCategoryId, editingProduct, editForm);
      setEditingProduct(null);
      setEditForm({});
    }
  };

  const handleDelete = (categoryId: string, productId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      onDeleteProduct(categoryId, productId);
    }
  };

  const handleAddNew = () => {
    if (!newProductForm.name || !newProductForm.price) {
      alert('Preencha pelo menos nome e preço.');
      return;
    }

    const categoryId = newProductForm.category || menuData[0].id;
    
    onAddProduct(categoryId, {
      name: newProductForm.name,
      description: newProductForm.description || '',
      price: Number(newProductForm.price),
      category: categoryId,
      image: newProductForm.image,
      code: newProductForm.code,
      subcategory: newProductForm.subcategory,
      ingredients: newProductForm.ingredients || []
    });

    setIsAddingNew(false);
    setNewProductForm({ category: menuData[0]?.id, image: '', price: 0, subcategory: '', ingredients: [] });
    alert('Produto adicionado!');
  };

  // --- OPTION ACTIONS ---
  const handleAddOptionGroup = () => {
    if (!newOptionName) return;
    
    const newGroup: ProductOption = {
      id: Date.now().toString(),
      name: newOptionName,
      type: newOptionType,
      required: false,
      choices: []
    };

    setEditForm(prev => ({
      ...prev,
      options: [...(prev.options || []), newGroup]
    }));

    setNewOptionName('');
  };

  const handleRemoveOptionGroup = (groupId: string) => {
    setEditForm(prev => ({
      ...prev,
      options: (prev.options || []).filter(o => o.id !== groupId)
    }));
  };

  const handleAddChoice = (groupId: string) => {
    const name = window.prompt("Nome da opção (ex: Catupiry):");
    if (!name) return;
    const priceStr = window.prompt("Preço adicional (digite 0 para grátis):", "0");
    if (priceStr === null) return;
    const price = parseFloat(priceStr.replace(',', '.')) || 0;

    setEditForm(prev => ({
      ...prev,
      options: (prev.options || []).map(opt => {
        if (opt.id === groupId) {
          return {
            ...opt,
            choices: [...opt.choices, { name, price }]
          };
        }
        return opt;
      })
    }));
  };

  const handleRemoveChoice = (groupId: string, choiceIndex: number) => {
    setEditForm(prev => ({
      ...prev,
      options: (prev.options || []).map(opt => {
        if (opt.id === groupId) {
          return {
            ...opt,
            choices: opt.choices.filter((_, idx) => idx !== choiceIndex)
          };
        }
        return opt;
      })
    }));
  };

  const handleToggleRequired = (groupId: string) => {
    setEditForm(prev => ({
      ...prev,
      options: (prev.options || []).map(opt => {
        if (opt.id === groupId) {
          return { ...opt, required: !opt.required };
        }
        return opt;
      })
    }));
  };

  // --- SETTINGS ACTIONS ---
  const handleSaveSettings = () => {
    onUpdateSettings(settingsForm);
    alert('Configurações salvas e atualizadas no site!');
  };

  const handleAddRegion = () => {
    if (!newRegionName || !newRegionPrice) return;
    
    const zipArray = newRegionZips
      ? newRegionZips.split(',').map(z => z.trim().replace(/[^0-9-]/g, '')).filter(z => z.length > 0)
      : [];

    const newRegion = {
      id: editingRegionId || newRegionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: newRegionName,
      price: parseFloat(newRegionPrice),
      zipPrefixes: zipArray
    };
    
    if (editingRegionId) {
      setSettingsForm({
        ...settingsForm,
        deliveryRegions: (settingsForm.deliveryRegions || []).map(r => r.id === editingRegionId ? newRegion : r)
      });
      setEditingRegionId(null);
    } else {
      setSettingsForm({
        ...settingsForm,
        deliveryRegions: [...(settingsForm.deliveryRegions || []), newRegion]
      });
    }
    
    setNewRegionName('');
    setNewRegionPrice('');
    setNewRegionZips('');
  };

  const startEditingRegion = (region: any) => {
    setEditingRegionId(region.id);
    setNewRegionName(region.name);
    setNewRegionPrice(region.price.toString());
    setNewRegionZips(region.zipPrefixes ? region.zipPrefixes.join(', ') : '');
  };

  const cancelEditingRegion = () => {
    setEditingRegionId(null);
    setNewRegionName('');
    setNewRegionPrice('');
    setNewRegionZips('');
  };

  const handleRemoveRegion = (id: string) => {
    if (window.confirm('Remover esta região de entrega?')) {
      setSettingsForm({
        ...settingsForm,
        deliveryRegions: (settingsForm.deliveryRegions || []).filter(r => r.id !== id)
      });
      if (editingRegionId === id) cancelEditingRegion();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isNew) {
          setNewProductForm({ ...newProductForm, image: reader.result as string });
        } else {
          setEditForm({ ...editForm, image: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CATEGORY ACTIONS ---
  const triggerAddCategory = () => {
    if (newCategoryName && onAddCategory) {
      onAddCategory(newCategoryName);
      setNewCategoryName('');
      alert('Categoria adicionada!');
    }
  };

  const triggerDeleteCategory = (id: string) => {
    if (onDeleteCategory) {
      onDeleteCategory(id);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-stone-200">
          <h2 className="text-2xl font-display text-italian-red mb-6 text-center">Área Administrativa</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Senha de Acesso</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-italian-green focus:border-transparent outline-none shadow-sm"
                placeholder="Digite a senha"
              />
            </div>
            <button type="submit" className="w-full bg-italian-red text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md">
              Entrar
            </button>
            <button type="button" onClick={onBack} className="w-full text-stone-500 text-sm hover:underline mt-2 text-center">
              Voltar para o Cardápio
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Helper to list current promos
  const currentPromos = menuData.find(c => c.id === 'promocoes')?.items || [];

  return (
    <div className="min-h-screen bg-stone-100 pb-20">
      <header className="bg-stone-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-bold text-lg hidden md:block">Gerenciar Sistema</h1>
            </div>
            <button 
              onClick={() => {
                if(window.confirm('Isso irá restaurar o cardápio original e apagar todas as suas alterações. Continuar?')) {
                  onResetMenu();
                }
              }}
              className="flex items-center gap-2 text-xs bg-red-900/50 hover:bg-red-900 px-3 py-1.5 rounded border border-red-800 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Resetar Tudo
            </button>
          </div>

          <div className="flex space-x-2 md:space-x-4 border-b border-stone-700 overflow-x-auto">
             <button 
                onClick={() => setActiveTab('menu')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'menu' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <Grid className="w-4 h-4" /> Cardápio
             </button>
             <button 
                onClick={() => setActiveTab('categories')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <List className="w-4 h-4" /> Categorias
             </button>
             <button 
                onClick={() => setActiveTab('settings')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <Settings className="w-4 h-4" /> Configurações
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        
        {/* --- TAB: CATEGORIES --- */}
        {activeTab === 'categories' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in slide-in-from-bottom-2 space-y-8">
              {/* ... Keep Category Tab Content ... */}
              <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                <List className="w-5 h-5 text-italian-red" /> Gerenciar Categorias
              </h2>
              {/* ... (Existing Category Logic) ... */}
              <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                 <h3 className="font-bold text-sm text-stone-700 mb-2">Adicionar Nova Categoria</h3>
                 <div className="flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Nome da categoria (ex: Vinhos)" 
                     className="flex-1 p-2 bg-white border border-stone-300 rounded-lg text-sm"
                     value={newCategoryName}
                     onChange={(e) => setNewCategoryName(e.target.value)}
                   />
                   <button 
                     onClick={triggerAddCategory}
                     className="bg-italian-green text-white px-4 rounded-lg text-sm font-bold hover:bg-green-700"
                   >
                     Adicionar
                   </button>
                 </div>
              </div>
              <div className="space-y-2">
                 {menuData.filter(c => c.id !== 'promocoes').map((cat) => (
                    <div key={cat.id} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded-lg">
                       <div>
                          <span className="font-bold text-stone-800">{cat.name}</span>
                          <span className="text-xs text-stone-400 ml-2">({cat.items.length} produtos)</span>
                       </div>
                       <button 
                         onClick={() => triggerDeleteCategory(cat.id)}
                         className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"
                         title="Excluir Categoria"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in slide-in-from-bottom-2 space-y-8">
              {/* ... Keep Settings Tab Content ... */}
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-italian-red" /> Dados do Estabelecimento
                </h2>
                {/* ... Guide Toggle & Inputs ... */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex items-center justify-between">
                   <div>
                      <h3 className="font-bold text-blue-900 flex items-center gap-2">
                         <HelpCircle className="w-5 h-5" /> Guia de Uso (Tour)
                      </h3>
                      <p className="text-xs text-blue-700 mt-1">
                         Ative para mostrar um tutorial passo-a-passo para novos visitantes.
                      </p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settingsForm.enableGuide !== false} 
                        onChange={(e) => setSettingsForm({...settingsForm, enableGuide: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Inputs... */}
                   <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">Nome</label>
                      <input type="text" value={settingsForm.name} onChange={(e) => setSettingsForm({...settingsForm, name: e.target.value})} className="w-full p-2.5 bg-white border border-stone-300 rounded-md"/>
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">WhatsApp</label>
                      <input type="text" value={settingsForm.whatsapp} onChange={(e) => setSettingsForm({...settingsForm, whatsapp: e.target.value})} className="w-full p-2.5 bg-white border border-stone-300 rounded-md"/>
                   </div>
                   {/* ... Other inputs ... */}
                </div>
              </div>
              <hr className="border-stone-200" />
              <div>
                 {/* ... Region Logic ... */}
                 <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                   <MapPin className="w-5 h-5 text-italian-red" /> Taxas de Entrega
                </h2>
                {/* ... (Existing Region UI) ... */}
                <div className={`p-4 rounded-lg border mb-4 transition-colors ${editingRegionId ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200'}`}>
                   {/* ... Region Form ... */}
                   <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-8 md:col-span-9">
                           <label className="block text-xs font-bold text-stone-500 mb-1">Nome</label>
                           <input type="text" value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm"/>
                        </div>
                        <div className="col-span-4 md:col-span-3">
                           <label className="block text-xs font-bold text-stone-500 mb-1">Taxa</label>
                           <input type="number" value={newRegionPrice} onChange={(e) => setNewRegionPrice(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-3 items-end">
                         <div className="col-span-10">
                           <label className="block text-xs font-bold text-stone-500 mb-1">CEPs</label>
                           <input type="text" value={newRegionZips} onChange={(e) => setNewRegionZips(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm"/>
                         </div>
                         <div className="col-span-2 flex gap-1">
                           <button onClick={handleAddRegion} className="flex-1 p-2 bg-italian-green text-white rounded-md flex items-center justify-center">
                              {editingRegionId ? <Check className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                           </button>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="space-y-2">
                   {(settingsForm.deliveryRegions || []).map((region, idx) => (
                      <div key={idx} className="flex justify-between p-3 bg-white border rounded-lg">
                         <div><span className="font-bold">{region.name}</span> <span className="text-green-600">R$ {region.price}</span></div>
                         <div className="flex gap-2">
                            <button onClick={() => startEditingRegion(region)}><Edit3 className="w-4 h-4"/></button>
                            <button onClick={() => handleRemoveRegion(region.id)}><Trash2 className="w-4 h-4"/></button>
                         </div>
                      </div>
                   ))}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-stone-100">
                  <button onClick={handleSaveSettings} className="px-6 py-2.5 bg-italian-green text-white rounded-lg font-bold">Salvar Configurações</button>
              </div>
           </div>
        )}

        {/* --- TAB: MENU --- */}
        {activeTab === 'menu' && (
          <>
            {/* Promo Section Omitted for brevity */}
            {/* ... */}
            
            <button 
               onClick={() => setIsAddingNew(!isAddingNew)}
               className="w-full py-3 bg-white border-2 border-dashed border-stone-300 text-stone-500 rounded-xl hover:border-italian-green hover:text-italian-green transition-colors font-bold flex items-center justify-center gap-2 mb-6"
            >
               {isAddingNew ? <Trash2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
               {isAddingNew ? 'Cancelar Adição' : 'Adicionar Novo Produto'}
            </button>

            {isAddingNew && (
               <div className="bg-white p-6 rounded-xl shadow-lg border border-italian-green mb-6 animate-in slide-in-from-top-4">
                  <h3 className="font-bold text-lg mb-4 text-stone-800">Novo Produto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* ... Basic Inputs ... */}
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Categoria</label>
                        <select value={newProductForm.category} onChange={(e) => setNewProductForm({...newProductForm, category: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg">
                           {menuData.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Subcategoria (Valor/Tamanho)</label>
                        <input type="text" className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg" 
                           placeholder="Ex: Lata, Long Neck..." value={newProductForm.subcategory || ''} onChange={e => setNewProductForm({...newProductForm, subcategory: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Preço (R$)</label>
                        <input type="number" step="0.01" className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg" 
                           value={newProductForm.price} onChange={e => setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})} />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nome</label>
                        <input type="text" className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg" value={newProductForm.name || ''} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Descrição</label>
                        <input type="text" className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg" value={newProductForm.description || ''} onChange={e => setNewProductForm({...newProductForm, description: e.target.value})} />
                     </div>
                     
                     {/* NEW: INGREDIENTS */}
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Ingredientes</label>
                        <div className="flex gap-2 mb-2">
                          <input 
                            type="text" 
                            className="flex-1 p-2 bg-stone-50 border border-stone-300 rounded-lg text-sm"
                            placeholder="Ex: Tomate, Cebola, Bacon..."
                            value={tempIngredient}
                            onChange={(e) => setTempIngredient(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addIngredientToNew()}
                          />
                          <button onClick={addIngredientToNew} className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 rounded-lg text-sm font-bold"><Plus className="w-4 h-4"/></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {(newProductForm.ingredients || []).map((ing, i) => (
                             <span key={i} className="bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded-full border border-stone-200 flex items-center gap-1">
                               {ing} <button onClick={() => removeIngredientFromNew(i)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                             </span>
                           ))}
                        </div>
                     </div>
                     
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Imagem</label>
                        <input type="file" className="w-full text-xs" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                     </div>
                  </div>
                  <button onClick={handleAddNew} className="mt-4 w-full bg-italian-green text-white py-2 rounded-lg font-bold hover:bg-green-700">Confirmar e Adicionar</button>
               </div>
            )}

            {menuData.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden mb-4">
                <button 
                  onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  className="w-full px-4 py-4 flex items-center justify-between bg-white hover:bg-stone-50 transition-colors text-left border-b border-stone-100"
                >
                  <h3 className="font-bold text-lg text-stone-800">{category.name} <span className="text-xs text-stone-400 font-normal ml-2">({category.items.length} itens)</span></h3>
                </button>

                {expandedCategory === category.id && (
                  <div className="divide-y divide-stone-100">
                    {category.items.map((item) => (
                      <div key={item.id} className="p-4 bg-stone-50/50">
                        {editingProduct === item.id ? (
                          <div className="space-y-4 bg-white p-4 rounded-lg border border-italian-green shadow-md animate-in fade-in zoom-in-95 duration-200">
                            
                            {/* BASIC PRODUCT EDIT */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-stone-700 mb-1">Nome</label>
                                <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm focus:ring-1 focus:ring-italian-green outline-none"/>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">Preço (R$)</label>
                                <input type="number" step="0.01" value={editForm.price || 0} onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value)})} className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm focus:ring-1 focus:ring-italian-green outline-none"/>
                              </div>
                               <div className="md:col-span-3">
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                      <label className="block text-xs font-bold text-stone-700 mb-1">Subcategoria (Valor/Tamanho)</label>
                                      <input type="text" value={editForm.subcategory || ''} onChange={(e) => setEditForm({...editForm, subcategory: e.target.value})} placeholder="Ex: 600ml, Lata, Suco Natural..." className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm focus:ring-1 focus:ring-italian-green outline-none"/>
                                  </div>
                                </div>
                              </div>
                              
                              {/* EDIT INGREDIENTS */}
                              <div className="md:col-span-3 border-t border-stone-100 pt-3">
                                <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                                  <Utensils className="w-4 h-4 text-italian-red" /> Ingredientes do Produto
                                </label>
                                <div className="flex gap-2 mb-2">
                                  <input 
                                    type="text" 
                                    className="flex-1 p-2 bg-stone-50 border border-stone-300 rounded-lg text-sm"
                                    placeholder="Adicionar ingrediente..."
                                    value={tempIngredient}
                                    onChange={(e) => setTempIngredient(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addIngredientToEdit()}
                                  />
                                  <button onClick={addIngredientToEdit} className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 rounded-lg text-sm font-bold"><Plus className="w-4 h-4"/></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                   {(editForm.ingredients || []).map((ing, i) => (
                                     <span key={i} className="bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded-full border border-stone-200 flex items-center gap-1">
                                       {ing} <button onClick={() => removeIngredientFromEdit(i)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                                     </span>
                                   ))}
                                   {(!editForm.ingredients || editForm.ingredients.length === 0) && (
                                     <span className="text-xs text-stone-400 italic">Sem ingredientes listados.</span>
                                   )}
                                </div>
                              </div>

                            </div>

                            {/* CUSTOMIZATION OPTIONS EDITOR */}
                            <div className="mt-6 border-t border-stone-100 pt-4">
                              <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-italian-red" /> Personalização / Opções
                              </h4>
                              {/* ... Options UI (Keep existing) ... */}
                              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mb-4">
                                <div className="flex gap-2 mb-2">
                                  <input type="text" placeholder="Nome da Opção (ex: Borda Recheada)" className="flex-1 p-2 bg-white border border-stone-300 rounded text-sm" value={newOptionName} onChange={e => setNewOptionName(e.target.value)}/>
                                  <select className="p-2 bg-white border border-stone-300 rounded text-sm" value={newOptionType} onChange={(e) => setNewOptionType(e.target.value as any)}>
                                    <option value="single">Seleção Única (Radio)</option>
                                    <option value="multiple">Múltipla Escolha (Check)</option>
                                  </select>
                                  <button onClick={handleAddOptionGroup} className="bg-stone-800 text-white px-3 rounded text-sm font-bold"><Plus className="w-4 h-4" /></button>
                                </div>
                              </div>
                              <div className="space-y-4">
                                {editForm.options?.map((option, optIdx) => (
                                  <div key={option.id} className="border border-stone-200 rounded-lg p-3 bg-white">
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-stone-100">
                                      <div><span className="font-bold text-sm text-stone-800">{option.name}</span></div>
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => handleRemoveOptionGroup(option.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    </div>
                                    <div className="space-y-2 pl-2 border-l-2 border-stone-100">
                                      {option.choices.map((choice, cIdx) => (
                                        <div key={cIdx} className="flex justify-between items-center text-xs text-stone-600 bg-stone-50 p-1.5 rounded">
                                          <span>{choice.name} (+R$ {choice.price.toFixed(2)})</span>
                                          <button onClick={() => handleRemoveChoice(option.id, cIdx)} className="text-stone-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                        </div>
                                      ))}
                                      <button onClick={() => handleAddChoice(option.id)} className="text-xs text-italian-green font-bold flex items-center gap-1 hover:underline mt-2"><Plus className="w-3 h-3" /> Adicionar Item</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-between gap-3 pt-4 border-t border-stone-100 mt-4">
                              <button onClick={() => handleDelete(category.id, item.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold flex items-center gap-1"><Trash2 className="w-4 h-4" /> Excluir</button>
                              <div className="flex gap-2">
                                 <button onClick={() => setEditingProduct(null)} className="px-4 py-2 text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 text-sm font-bold shadow-sm">Cancelar</button>
                                 <button onClick={() => saveEdit(category.id)} className="px-4 py-2 text-white bg-italian-green rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="h-14 w-14 rounded-lg bg-stone-100 shrink-0 overflow-hidden border border-stone-200">
                                {item.image ? (<img src={item.image} alt={item.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-stone-300"><ImageIcon className="w-6 h-6" /></div>)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-stone-800 truncate text-base">{item.name}</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                   <p className="text-sm font-semibold text-italian-green mt-0.5">R$ {item.price.toFixed(2)}</p>
                                   {item.subcategory && <span className="text-[10px] bg-stone-100 text-stone-600 px-1 rounded border border-stone-200">{item.subcategory}</span>}
                                   {item.ingredients && item.ingredients.length > 0 && <span className="text-[10px] bg-green-50 text-green-700 px-1 rounded border border-green-200">{item.ingredients.length} Ingred.</span>}
                                </div>
                              </div>
                            </div>
                            <button onClick={() => startEditing(item)} className="p-2.5 text-stone-400 hover:text-italian-green hover:bg-green-50 rounded-lg transition-colors"><Edit3 className="w-5 h-5" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
};