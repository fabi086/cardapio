
import React, { useState, useEffect } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Layers, Megaphone, Tag, List, HelpCircle, Utensils, Phone, CreditCard, Truck } from 'lucide-react';

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
  onUpdateCategory?: (id: string, updates: { name?: string; image?: string }) => void;
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
  onUpdateCategory,
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
  
  // Settings List Helpers
  const [tempPhone, setTempPhone] = useState('');
  const [tempPayment, setTempPayment] = useState('');

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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryImage, setEditCategoryImage] = useState('');

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

  // --- SETTINGS HELPER FUNCTIONS ---
  const addPhone = () => {
    if (tempPhone.trim()) {
      setSettingsForm(prev => ({
        ...prev,
        phones: [...prev.phones, tempPhone.trim()]
      }));
      setTempPhone('');
    }
  };

  const removePhone = (index: number) => {
    setSettingsForm(prev => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index)
    }));
  };

  const addPaymentMethod = () => {
    if (tempPayment.trim()) {
      setSettingsForm(prev => ({
        ...prev,
        paymentMethods: [...(prev.paymentMethods || []), tempPayment.trim()]
      }));
      setTempPayment('');
    }
  };

  const removePaymentMethod = (index: number) => {
    setSettingsForm(prev => ({
      ...prev,
      paymentMethods: (prev.paymentMethods || []).filter((_, i) => i !== index)
    }));
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

  // --- CATEGORY IMAGE UPLOAD ---
  const handleCategoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditCategoryImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  // --- CATEGORY ACTIONS ---
  const triggerAddCategory = () => {
    if (newCategoryName && onAddCategory) {
      onAddCategory(newCategoryName);
      setNewCategoryName('');
      alert('Categoria adicionada!');
    }
  };

  const triggerUpdateCategory = () => {
    if (editingCategoryId && onUpdateCategory) {
      onUpdateCategory(editingCategoryId, { name: editCategoryName, image: editCategoryImage });
      setEditingCategoryId(null);
      setEditCategoryName('');
      setEditCategoryImage('');
    }
  };

  const startEditingCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryImage(category.image || '');
  };

  const cancelEditingCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategoryImage('');
  };

  const triggerDeleteCategory = (id: string) => {
    if (onDeleteCategory) {
      onDeleteCategory(id);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 text-stone-800 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-stone-100 pb-20 text-stone-800">
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
              <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                <List className="w-5 h-5 text-italian-red" /> Gerenciar Categorias
              </h2>
              <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                 <h3 className="font-bold text-sm text-stone-700 mb-2">Adicionar Nova Categoria</h3>
                 <div className="flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Nome da categoria (ex: Vinhos)" 
                     className="flex-1 p-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900"
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
                    <div key={cat.id} className="p-3 bg-white border border-stone-200 rounded-lg">
                       {editingCategoryId === cat.id ? (
                          <div className="space-y-3">
                             <div className="grid gap-2">
                                <label className="text-xs font-bold text-stone-500">Nome da Categoria</label>
                                <input 
                                  type="text" 
                                  value={editCategoryName}
                                  onChange={(e) => setEditCategoryName(e.target.value)}
                                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900"
                                />
                             </div>
                             <div className="grid gap-2">
                                <label className="text-xs font-bold text-stone-500">Imagem de Capa</label>
                                <div className="flex items-center gap-3">
                                   <div className="w-16 h-12 rounded bg-stone-100 border border-stone-200 overflow-hidden">
                                      {editCategoryImage ? (
                                         <img src={editCategoryImage} className="w-full h-full object-cover" />
                                      ) : (
                                         <ImageIcon className="w-full h-full p-3 text-stone-300" />
                                      )}
                                   </div>
                                   <input 
                                     type="file" 
                                     className="text-xs text-stone-500"
                                     onChange={handleCategoryImageUpload}
                                   />
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={triggerUpdateCategory} className="bg-italian-green text-white px-3 py-1.5 rounded text-sm font-bold">Salvar</button>
                                <button onClick={cancelEditingCategory} className="bg-stone-200 text-stone-700 px-3 py-1.5 rounded text-sm font-bold">Cancelar</button>
                             </div>
                          </div>
                       ) : (
                          <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-8 rounded bg-stone-100 border border-stone-200 overflow-hidden">
                                   {cat.image ? (
                                      <img src={cat.image} className="w-full h-full object-cover" />
                                   ) : (
                                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                                         <ImageIcon className="w-4 h-4" />
                                      </div>
                                   )}
                                </div>
                                <div>
                                   <span className="font-bold text-stone-800 block">{cat.name}</span>
                                   <span className="text-xs text-stone-400">({cat.items.length} produtos)</span>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => startEditingCategory(cat)}
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                                  title="Editar Categoria"
                                >
                                   <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => triggerDeleteCategory(cat.id)}
                                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Excluir Categoria"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in slide-in-from-bottom-2 space-y-8">
              {/* Settings Form Content */}
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-italian-red" /> Dados do Estabelecimento
                </h2>
                
                {/* Guide Toggle */}
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

                {/* Free Shipping Toggle */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6 flex items-center justify-between">
                   <div>
                      <h3 className="font-bold text-green-900 flex items-center gap-2">
                         <Truck className="w-5 h-5" /> Frete Grátis Global
                      </h3>
                      <p className="text-xs text-green-700 mt-1">
                         Ative para zerar a taxa de entrega de todas as regiões (útil para testes ou promoções).
                      </p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settingsForm.freeShipping === true} 
                        onChange={(e) => setSettingsForm({...settingsForm, freeShipping: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-italian-green"></div>
                   </label>
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* ... (Existing Settings Inputs - Same as before but ensuring contrast) ... */}
                   <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">Nome</label>
                      <input 
                        type="text" 
                        value={settingsForm.name} 
                        onChange={(e) => setSettingsForm({...settingsForm, name: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">WhatsApp</label>
                      <input 
                        type="text" 
                        value={settingsForm.whatsapp} 
                        onChange={(e) => setSettingsForm({...settingsForm, whatsapp: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                      />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">Endereço</label>
                      <textarea 
                        rows={3} 
                        value={settingsForm.address} 
                        onChange={(e) => setSettingsForm({...settingsForm, address: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                      />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">Horário de Funcionamento</label>
                      <textarea 
                        rows={2}
                        value={settingsForm.openingHours} 
                        onChange={(e) => setSettingsForm({...settingsForm, openingHours: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                        placeholder="Ex: Aberto todos os dias das 18h às 23h"
                      />
                   </div>
                   
                   {/* Phone Management */}
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-italian-red" /> Telefones
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text" 
                          className="flex-1 p-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                          placeholder="Ex: (11) 99999-9999"
                          value={tempPhone}
                          onChange={(e) => setTempPhone(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addPhone()}
                        />
                        <button onClick={addPhone} className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 rounded-lg text-sm font-bold"><Plus className="w-4 h-4"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {settingsForm.phones.map((ph, i) => (
                           <span key={i} className="bg-stone-100 text-stone-600 text-sm px-3 py-1.5 rounded-full border border-stone-200 flex items-center gap-2">
                             {ph} <button onClick={() => removePhone(i)} className="hover:text-red-500"><X className="w-4 h-4"/></button>
                           </span>
                         ))}
                      </div>
                   </div>

                   {/* Payment Methods */}
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-italian-red" /> Formas de Pagamento
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text" 
                          className="flex-1 p-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                          placeholder="Ex: Vale Refeição, Pix, etc."
                          value={tempPayment}
                          onChange={(e) => setTempPayment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addPaymentMethod()}
                        />
                        <button onClick={addPaymentMethod} className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 rounded-lg text-sm font-bold"><Plus className="w-4 h-4"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {(settingsForm.paymentMethods || []).map((pm, i) => (
                           <span key={i} className="bg-green-50 text-green-800 text-sm px-3 py-1.5 rounded-full border border-green-200 flex items-center gap-2">
                             {pm} <button onClick={() => removePaymentMethod(i)} className="hover:text-red-500"><X className="w-4 h-4"/></button>
                           </span>
                         ))}
                      </div>
                   </div>

                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">URL do Logo</label>
                      <input 
                        type="text" 
                        value={settingsForm.logoUrl} 
                        onChange={(e) => setSettingsForm({...settingsForm, logoUrl: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                      />
                   </div>
                </div>
              </div>

              <hr className="border-stone-200" />
              
              <div>
                 <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                   <MapPin className="w-5 h-5 text-italian-red" /> Taxas de Entrega
                </h2>
                
                {/* Region Editing Form */}
                <div className={`p-4 rounded-lg border mb-4 transition-colors ${editingRegionId ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200'}`}>
                   <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-8 md:col-span-9">
                           <label className="block text-xs font-bold text-stone-500 mb-1">Nome</label>
                           <input type="text" value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm text-stone-900"/>
                        </div>
                        <div className="col-span-4 md:col-span-3">
                           <label className="block text-xs font-bold text-stone-500 mb-1">Taxa</label>
                           <input type="number" value={newRegionPrice} onChange={(e) => setNewRegionPrice(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm text-stone-900"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-3 items-end">
                         <div className="col-span-10">
                           <label className="block text-xs font-bold text-stone-500 mb-1">CEPs (separados por vírgula)</label>
                           <input type="text" value={newRegionZips} onChange={(e) => setNewRegionZips(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm text-stone-900" placeholder="Ex: 13295-000, 13295-001"/>
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
                         <div>
                            <span className="font-bold">{region.name}</span> <span className="text-green-600">R$ {region.price}</span>
                            {region.zipPrefixes && region.zipPrefixes.length > 0 && (
                               <div className="text-xs text-stone-400 mt-1">CEPs: {region.zipPrefixes.join(', ')}</div>
                            )}
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => startEditingRegion(region)} className="p-1 hover:text-blue-500"><Edit3 className="w-4 h-4"/></button>
                            <button onClick={() => handleRemoveRegion(region.id)} className="p-1 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                         </div>
                      </div>
                   ))}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-stone-100">
                  <button onClick={handleSaveSettings} className="px-6 py-2.5 bg-italian-green text-white rounded-lg font-bold hover:bg-green-700">Salvar Configurações</button>
              </div>
           </div>
        )}

        {/* --- TAB: MENU --- */}
        {activeTab === 'menu' && (
          <>
            <button 
               onClick={() => setIsAddingNew(!isAddingNew)}
               className="w-full py-3 bg-white border-2 border-dashed border-stone-300 text-stone-500 rounded-xl hover:border-italian-green hover:text-italian-green transition-colors font-bold flex items-center justify-center gap-2 mb-6"
            >
               {isAddingNew ? <Trash2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
               {isAddingNew ? 'Cancelar Adição' : 'Adicionar Novo Produto'}
            </button>

            {isAddingNew && (
               <div className="bg-white p-6 rounded-xl shadow-lg border border-italian-green mb-6 animate-in slide-in-from-top-4">
                  {/* ... (Existing New Product Form content - unchanged) ... */}
                  <h3 className="font-bold text-lg mb-4 text-stone-800">Novo Produto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Nome</label>
                        <input type="text" value={newProductForm.name || ''} onChange={(e) => setNewProductForm({...newProductForm, name: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Preço</label>
                        <input type="number" step="0.01" value={newProductForm.price || ''} onChange={(e) => setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Descrição</label>
                        <textarea value={newProductForm.description || ''} onChange={(e) => setNewProductForm({...newProductForm, description: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" rows={2}></textarea>
                     </div>
                     <div className="md:col-span-2 border-t border-stone-100 pt-3">
                        <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-italian-red" /> Imagem do Produto
                        </label>
                        <div className="flex items-center gap-4 bg-stone-50 p-2 rounded-lg border border-stone-200">
                            {newProductForm.image ? (
                              <img src={newProductForm.image} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-stone-200 bg-white" />
                            ) : (
                              <div className="h-16 w-16 flex items-center justify-center bg-stone-100 rounded-md border border-stone-200 text-stone-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            <div className="flex-1">
                              <input 
                                type="file" 
                                className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-italian-green file:text-white hover:file:bg-green-700 cursor-pointer"
                                accept="image/*" 
                                onChange={(e) => handleImageUpload(e, true)} 
                              />
                              <p className="text-[10px] text-stone-400 mt-1">Recomendado: Imagens quadradas ou retangulares (JPG/PNG)</p>
                            </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Categoria</label>
                        <select value={newProductForm.category || ''} onChange={(e) => setNewProductForm({...newProductForm, category: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900">
                           {menuData.filter(c => c.id !== 'promocoes').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Subcategoria (Opcional)</label>
                        <input type="text" placeholder="Ex: Long Neck, Lata" value={newProductForm.subcategory || ''} onChange={(e) => setNewProductForm({...newProductForm, subcategory: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                     </div>
                     
                     {/* Ingredients for New Product */}
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Ingredientes</label>
                        <div className="flex gap-2 mb-2">
                          <input 
                             type="text" 
                             className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                             placeholder="Ex: Mussarela, Tomate"
                             value={tempIngredient}
                             onChange={(e) => setTempIngredient(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && addIngredientToNew()}
                          />
                          <button onClick={addIngredientToNew} className="bg-stone-200 text-stone-700 px-3 rounded-lg"><Plus className="w-4 h-4"/></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(newProductForm.ingredients || []).map((ing, i) => (
                             <span key={i} className="bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded-full border border-stone-200 flex items-center gap-1">
                               {ing} <button onClick={() => removeIngredientFromNew(i)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                             </span>
                          ))}
                        </div>
                     </div>
                  </div>
                  <button onClick={handleAddNew} className="w-full mt-4 bg-italian-green text-white py-2 rounded-lg font-bold hover:bg-green-700">Salvar Produto</button>
               </div>
            )}

            <div className="space-y-6">
              {menuData.filter(c => c.id !== 'promocoes').map((category) => (
                <div key={category.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                  <div 
                    className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  >
                    <h3 className="font-bold text-lg text-stone-800 flex items-center gap-2">
                       {category.name} <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">{category.items.length}</span>
                    </h3>
                    <div className={`transform transition-transform ${expandedCategory === category.id ? 'rotate-180' : ''}`}>
                      <Utensils className="w-5 h-5 text-stone-400" />
                    </div>
                  </div>
                  
                  {expandedCategory === category.id && (
                    <div className="p-4 space-y-4">
                      {category.items.length === 0 ? (
                        <p className="text-center text-stone-400 py-4 text-sm">Nenhum produto nesta categoria.</p>
                      ) : (
                        category.items.map((product) => (
                          <div key={product.id} className="border border-stone-100 rounded-lg p-4 hover:border-stone-300 transition-colors">
                            {editingProduct === product.id ? (
                              <div className="space-y-4 animate-in fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div>
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Nome</label>
                                      <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                                   </div>
                                   <div>
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Preço</label>
                                      <input type="number" step="0.01" value={editForm.price || ''} onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value)})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                                   </div>
                                   <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Descrição</label>
                                      <textarea value={editForm.description || ''} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" rows={2}></textarea>
                                   </div>
                                   
                                   {/* EDIT IMAGE UPLOAD SECTION */}
                                   <div className="md:col-span-2 border-t border-stone-100 pt-3">
                                      <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-italian-red" /> Imagem do Produto
                                      </label>
                                      <div className="flex items-center gap-4 bg-stone-50 p-2 rounded-lg border border-stone-200">
                                          {editForm.image ? (
                                            <img src={editForm.image} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-stone-200 bg-white" />
                                          ) : (
                                            <div className="h-16 w-16 flex items-center justify-center bg-stone-100 rounded-md border border-stone-200 text-stone-400">
                                              <ImageIcon className="w-6 h-6" />
                                            </div>
                                          )}
                                          <div className="flex-1">
                                            <input 
                                              type="file" 
                                              className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-italian-green file:text-white hover:file:bg-green-700 cursor-pointer"
                                              accept="image/*" 
                                              onChange={(e) => handleImageUpload(e, false)} 
                                            />
                                            <p className="text-[10px] text-stone-400 mt-1">Recomendado: Imagens quadradas ou retangulares (JPG/PNG)</p>
                                          </div>
                                      </div>
                                   </div>

                                   <div>
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Categoria</label>
                                      <select value={editForm.category || ''} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900">
                                         {menuData.filter(c => c.id !== 'promocoes').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                      </select>
                                   </div>
                                   <div>
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Subcategoria (Opcional)</label>
                                      <input type="text" value={editForm.subcategory || ''} onChange={(e) => setEditForm({...editForm, subcategory: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                                   </div>

                                   {/* Ingredients for Editing */}
                                   <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Ingredientes</label>
                                      <div className="flex gap-2 mb-2">
                                        <input 
                                           type="text" 
                                           className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                                           placeholder="Ex: Mussarela, Tomate"
                                           value={tempIngredient}
                                           onChange={(e) => setTempIngredient(e.target.value)}
                                           onKeyDown={(e) => e.key === 'Enter' && addIngredientToEdit()}
                                        />
                                        <button onClick={addIngredientToEdit} className="bg-stone-200 text-stone-700 px-3 rounded-lg"><Plus className="w-4 h-4"/></button>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {(editForm.ingredients || []).map((ing, i) => (
                                           <span key={i} className="bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded-full border border-stone-200 flex items-center gap-1">
                                             {ing} <button onClick={() => removeIngredientFromEdit(i)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                                           </span>
                                        ))}
                                      </div>
                                   </div>
                                </div>
                                
                                {/* Option Groups Management */}
                                <div className="border-t border-stone-100 pt-4 mt-4">
                                   <div className="flex justify-between items-center mb-4">
                                      <h4 className="font-bold text-sm text-stone-700 flex items-center gap-2"><Layers className="w-4 h-4"/> Personalização (Bordas/Adicionais)</h4>
                                   </div>
                                   
                                   <div className="space-y-4 mb-4">
                                      {(editForm.options || []).map((option) => (
                                         <div key={option.id} className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                                            <div className="flex justify-between items-center mb-2">
                                               <span className="font-bold text-sm text-stone-800">{option.name} <span className="text-xs font-normal text-stone-500">({option.type === 'single' ? 'Escolha Única' : 'Múltipla Escolha'})</span></span>
                                               <button onClick={() => handleRemoveOptionGroup(option.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Remover Grupo</button>
                                            </div>
                                            <div className="space-y-1 pl-2 border-l-2 border-stone-200">
                                               {option.choices.map((choice, idx) => (
                                                  <div key={idx} className="flex justify-between text-sm">
                                                     <span className="text-stone-600">{choice.name}</span>
                                                     <div className="flex items-center gap-2">
                                                        <span className="text-stone-500 font-mono text-xs">+R$ {choice.price.toFixed(2)}</span>
                                                        <button onClick={() => handleRemoveChoice(option.id, idx)} className="text-stone-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                                     </div>
                                                  </div>
                                               ))}
                                               <button onClick={() => handleAddChoice(option.id)} className="text-xs text-italian-green font-bold mt-2 hover:underline">+ Adicionar Opção</button>
                                            </div>
                                         </div>
                                      ))}
                                   </div>

                                   <div className="flex gap-2 items-end bg-stone-50 p-3 rounded-lg border border-stone-200">
                                      <div className="flex-1">
                                         <label className="block text-xs font-bold text-stone-400 mb-1">Novo Grupo</label>
                                         <input type="text" placeholder="Ex: Borda" value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900"/>
                                      </div>
                                      <div className="w-32">
                                          <label className="block text-xs font-bold text-stone-400 mb-1">Tipo</label>
                                          <select value={newOptionType} onChange={(e) => setNewOptionType(e.target.value as any)} className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900">
                                             <option value="single">Única (Radio)</option>
                                             <option value="multiple">Múltipla (Check)</option>
                                          </select>
                                      </div>
                                      <button onClick={handleAddOptionGroup} className="bg-stone-800 text-white px-3 py-2 rounded-lg text-xs font-bold">Criar</button>
                                   </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                  <button onClick={() => saveEdit(category.id)} className="flex-1 bg-italian-green text-white py-2 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> Salvar Alterações
                                  </button>
                                  <button onClick={() => setEditingProduct(null)} className="px-4 bg-stone-200 text-stone-600 rounded-lg font-bold hover:bg-stone-300">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                  <div className="w-16 h-16 bg-stone-100 rounded-md overflow-hidden shrink-0">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-full h-full p-4 text-stone-300" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-stone-800">{product.name}</h4>
                                    <p className="text-sm text-stone-500 line-clamp-1">{product.description}</p>
                                    <p className="text-italian-green font-bold mt-1">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                                    {product.ingredients && product.ingredients.length > 0 && (
                                       <div className="flex flex-wrap gap-1 mt-1">
                                          {product.ingredients.map((ing, i) => (
                                             <span key={i} className="text-[10px] bg-stone-100 px-1.5 rounded text-stone-500">{ing}</span>
                                          ))}
                                       </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => startEditing(product)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                    <Edit3 className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => handleDelete(category.id, product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
