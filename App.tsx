import React, { useState, useEffect } from 'react';
import { MENU_DATA, DEFAULT_SETTINGS } from './data';
import { Product, CartItem, Category, StoreSettings } from './types';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { ShoppingBag, Check, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const isValidCartItem = (item: any): item is CartItem => {
  return (
    item &&
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.quantity === 'number' &&
    item.quantity > 0
  );
};

function App() {
  const [menuData, setMenuData] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    if (!supabase) {
      setMenuData(MENU_DATA);
      setStoreSettings(DEFAULT_SETTINGS);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('order_index');
      
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*');

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .order('id', { ascending: true }) 
        .limit(1)
        .maybeSingle();

      if (catError) throw catError;
      if (prodError) throw prodError;
      if (settingsError) throw settingsError;

      if (categories && products) {
        const structuredMenu: Category[] = categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          items: products
            .filter((prod: any) => prod.category_id === cat.id)
            .sort((a: any, b: any) => a.id - b.id)
            .map((prod: any) => {
              // Parse options if string, or keep as is
              let opts = prod.options;
              if (typeof opts === 'string') {
                try { opts = JSON.parse(opts); } catch(e) { opts = []; }
              }
              return { ...prod, options: opts || [] };
            })
        }));
        setMenuData(structuredMenu);
      }

      if (settingsData) {
        setSettingsId(settingsData.id);
        
        let deliveryRegions = settingsData.delivery_regions;
        if (typeof deliveryRegions === 'string') {
          try {
            deliveryRegions = JSON.parse(deliveryRegions);
          } catch (e) {
            deliveryRegions = DEFAULT_SETTINGS.deliveryRegions;
          }
        }

        setStoreSettings({
            name: settingsData.name || DEFAULT_SETTINGS.name,
            whatsapp: settingsData.whatsapp || DEFAULT_SETTINGS.whatsapp,
            logoUrl: settingsData.logo_url || DEFAULT_SETTINGS.logoUrl,
            address: settingsData.address || DEFAULT_SETTINGS.address,
            openingHours: settingsData.opening_hours || DEFAULT_SETTINGS.openingHours,
            phones: (settingsData.phones && Array.isArray(settingsData.phones)) ? settingsData.phones : DEFAULT_SETTINGS.phones,
            deliveryRegions: Array.isArray(deliveryRegions) ? deliveryRegions : DEFAULT_SETTINGS.deliveryRegions
        });
      } else {
        setStoreSettings(DEFAULT_SETTINGS);
      }
      
      setError(null);

    } catch (err: any) {
      if (err.code === '42P01' || err.code === 'PGRST205') { 
         setMenuData(MENU_DATA);
         setStoreSettings(DEFAULT_SETTINGS);
         setError(null);
         setLoading(false);
         return;
      }

      console.error('Erro ao buscar dados:', JSON.stringify(err, null, 2));

      setMenuData(MENU_DATA);
      setStoreSettings(DEFAULT_SETTINGS);

      if (err.message && (err.message.includes('fetch') || err.message.includes('network'))) {
         setError('Erro de conexão. Usando dados offline.');
      } else {
         setError('Usando dados locais temporariamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('spagnolli_cart');
      if (!savedCart) return [];
      
      const parsed = JSON.parse(savedCart);
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidCartItem).map(item => ({
          ...item,
          observation: item.observation || '',
          selectedOptions: item.selectedOptions || []
        }));
      }
      return [];
    } catch (error) {
      try { localStorage.removeItem('spagnolli_cart'); } catch(e) {}
      return [];
    }
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isCartAnimating, setIsCartAnimating] = useState(false);

  useEffect(() => {
    if (menuData.length > 0 && !activeCategory) {
      setActiveCategory(menuData[0].id);
    }
  }, [menuData]);

  useEffect(() => {
    try {
      localStorage.setItem('spagnolli_cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cartItems]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // --- ADMIN ACTIONS ---
  
  const handleUpdateProduct = async (originalCategoryId: string, productId: number, updates: Partial<Product>) => {
    setMenuData(prevMenu => {
      if (updates.category && updates.category !== originalCategoryId) {
        let productToMove: Product | undefined;
        const menuWithoutProduct = prevMenu.map(cat => {
           if (cat.id === originalCategoryId) {
              const prod = cat.items.find(p => p.id === productId);
              if (prod) productToMove = { ...prod, ...updates };
              return { ...cat, items: cat.items.filter(p => p.id !== productId) };
           }
           return cat;
        });
        if (productToMove) {
           return menuWithoutProduct.map(cat => {
              if (cat.id === updates.category) {
                 return { ...cat, items: [...cat.items, productToMove!] };
              }
              return cat;
           });
        }
        return prevMenu;
      } 
      
      return prevMenu.map(cat => {
        if (cat.id !== originalCategoryId) return cat;
        return {
          ...cat,
          items: cat.items.map(prod => {
            if (prod.id !== productId) return prod;
            return { ...prod, ...updates };
          })
        };
      });
    });

    if (!supabase) return;

    try {
      // Stringify JSON fields for Supabase
      const payload: any = {
        name: updates.name,
        price: updates.price,
        description: updates.description,
        image: updates.image,
        category_id: updates.category,
        code: updates.code,
      };

      if (updates.options) {
        payload.options = JSON.stringify(updates.options);
      }

      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', productId);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar no Supabase:', err);
      fetchData();
    }
  };

  const handleAddProduct = async (categoryId: string, product: Omit<Product, 'id'>) => {
    const tempId = Date.now();
    
    setMenuData(prev => prev.map(cat => {
       if (cat.id === categoryId) {
          return { ...cat, items: [...cat.items, { ...product, id: tempId, category: categoryId }]};
       }
       return cat;
    }));

    if (!supabase) return;

    try {
       const payload: any = {
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image,
          category_id: categoryId,
          code: product.code,
          options: product.options ? JSON.stringify(product.options) : '[]'
       };

       const { data, error } = await supabase
         .from('products')
         .insert([payload])
         .select();
         
       if(error) throw error;
       
       if (data && data[0]) {
          const realId = data[0].id;
          setMenuData(prev => prev.map(cat => {
             if (cat.id === categoryId) {
                return { 
                   ...cat, 
                   items: cat.items.map(item => item.id === tempId ? { ...item, id: realId } : item)
                };
             }
             return cat;
          }));
       }
    } catch(err) {
       console.error(err);
       fetchData();
    }
  };

  const handleDeleteProduct = async (categoryId: string, productId: number) => {
     setMenuData(prev => prev.map(cat => {
        if (cat.id === categoryId) {
           return { ...cat, items: cat.items.filter(i => i.id !== productId) };
        }
        return cat;
     }));

     if (!supabase) return;
     
     try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
        if(error) throw error;
     } catch(err) {
        console.error(err);
        fetchData();
     }
  };

  const handleUpdateSettings = async (newSettings: StoreSettings) => {
     setStoreSettings(newSettings);

     if (!supabase) return;

     try {
        const deliveryRegionsJson = JSON.stringify(newSettings.deliveryRegions || []);

        const payload = { 
          name: newSettings.name,
          whatsapp: newSettings.whatsapp,
          address: newSettings.address,
          opening_hours: newSettings.openingHours,
          phones: newSettings.phones,
          logo_url: newSettings.logoUrl,
          delivery_regions: deliveryRegionsJson
       };

        if (settingsId) {
            const { error } = await supabase
               .from('settings')
               .update(payload)
               .eq('id', settingsId);
            
            if (error) throw error;
        } else {
            const { data, error } = await supabase
               .from('settings')
               .insert([payload])
               .select();
            
            if (error) throw error;
            if (data && data[0]) setSettingsId(data[0].id);
        }
     } catch (err: any) {
        console.error('Erro ao salvar configurações:', err);
        if (err.code === '42P01' || err.code === 'PGRST205') {
            alert('Erro: Tabelas não encontradas.');
        } else {
            alert('Ocorreu um erro ao salvar as configurações.');
        }
     }
  };

  const handleResetMenu = () => {
      fetchData();
      alert("Dados recarregados do servidor.");
  };

  const addToCart = (product: Product, quantity: number, observation: string, selectedOptions?: CartItem['selectedOptions']) => {
    const normalizedObservation = (observation || '').trim();
    
    // Create a unique key based on options to separate items (e.g., Pizza w/ Bacon vs Pizza w/o Bacon)
    const optionsKey = selectedOptions 
        ? JSON.stringify(selectedOptions.sort((a,b) => a.choiceName.localeCompare(b.choiceName))) 
        : '';

    setCartItems(prev => {
      // Find exact match (same id, same observation, same options)
      const existingItemIndex = prev.findIndex(item => {
        const itemOptionsKey = item.selectedOptions 
            ? JSON.stringify(item.selectedOptions.sort((a,b) => a.choiceName.localeCompare(b.choiceName))) 
            : '';
        
        return item.id === product.id && 
               (item.observation || '').trim() === normalizedObservation &&
               itemOptionsKey === optionsKey;
      });

      if (existingItemIndex >= 0) {
        const newItems = [...prev];
        const currentItem = newItems[existingItemIndex];
        newItems[existingItemIndex] = {
          ...currentItem,
          quantity: currentItem.quantity + quantity
        };
        return newItems;
      } else {
        return [...prev, { ...product, quantity, observation: normalizedObservation, selectedOptions }];
      }
    });
    
    setShowToast(true);
    setIsCartAnimating(true);
    setTimeout(() => setIsCartAnimating(false), 300);
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      if (window.confirm('Remover este item do carrinho?')) {
        removeFromCart(index);
      }
      return;
    }
    setCartItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], quantity: newQuantity };
      return newItems;
    });
  };

  const updateObservation = (index: number, newObservation: string) => {
    setCartItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], observation: newObservation };
      return newItems;
    });
  };

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (window.confirm('Tem certeza que deseja esvaziar o carrinho?')) {
      setCartItems([]);
      setIsCartOpen(false);
    }
  };

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const headerOffset = 120;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((acc, item) => {
     const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((s,o) => s + o.price, 0) : 0;
     return acc + ((item.price + optionsPrice) * (item.quantity || 0));
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-italian-red animate-spin" />
        <p className="text-stone-500 font-display">Carregando cardápio...</p>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <AdminPanel 
        menuData={menuData}
        settings={storeSettings}
        onUpdateProduct={handleUpdateProduct}
        onAddProduct={handleAddProduct}
        onDeleteProduct={handleDeleteProduct}
        onUpdateSettings={handleUpdateSettings}
        onResetMenu={handleResetMenu}
        onBack={() => setView('customer')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 pb-24 md:pb-0 font-sans relative">
      <Header 
        cartCount={totalItems} 
        onOpenCart={() => setIsCartOpen(true)} 
        animateCart={isCartAnimating}
        storeName={storeSettings.name}
        logoUrl={storeSettings.logoUrl}
      />
      
      {error && (
        <div className="bg-yellow-100 border-b border-yellow-200 text-yellow-800 px-4 py-2 text-xs text-center">
          {error}
        </div>
      )}
      
      <CategoryNav 
        categories={menuData} 
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
      />

      <main className="max-w-5xl mx-auto px-4 pt-6">
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl p-6 mb-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
             <span className="bg-italian-red text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Novidade</span>
             <h2 className="text-3xl font-display">Bateu a fome?</h2>
             <p className="text-stone-300 max-w-md">
               Escolha sua pizza favorita e receba no conforto da sua casa. 
             </p>
          </div>
          <div className="w-32 h-32 md:w-40 md:h-40 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white/10 shadow-inner relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80')] bg-cover bg-center opacity-90"></div>
          </div>
        </div>

        <div className="space-y-10">
          {menuData.map((category) => (
            <section 
              key={category.id} 
              id={`category-${category.id}`}
              className="scroll-mt-32"
            >
              <h2 className="text-2xl font-bold text-stone-800 mb-4 pl-2 border-l-4 border-italian-red">
                {category.name}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={addToCart} 
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer 
        onOpenAdmin={() => setView('admin')} 
        settings={storeSettings}
      />

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onUpdateQuantity={updateQuantity}
        onUpdateObservation={updateObservation}
        whatsappNumber={storeSettings.whatsapp}
        storeName={storeSettings.name}
        deliveryRegions={storeSettings.deliveryRegions || []}
      />

      {showToast && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-right duration-300 pointer-events-none">
          <div className="bg-italian-green text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded-full">
              <Check className="w-4 h-4" />
            </div>
            <span className="font-medium">Item adicionado ao carrinho!</span>
          </div>
        </div>
      )}

      {totalItems > 0 && !isCartOpen && (
        <>
          <div className="fixed bottom-4 left-4 right-4 md:hidden z-40">
            <button 
              onClick={() => setIsCartOpen(true)}
              className={`w-full bg-italian-green text-white py-3 px-6 rounded-xl shadow-xl shadow-green-900/20 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-300 ring-2 ring-white/20 transition-transform ${isCartAnimating ? 'scale-105 bg-green-600' : ''}`}
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-xs font-light text-green-100">Total estimado</span>
                <span className="font-bold text-lg">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className={`flex items-center gap-2 bg-green-700/50 px-3 py-1.5 rounded-lg transition-transform duration-300 ${isCartAnimating ? 'scale-110' : ''}`}>
                <ShoppingBag className="w-5 h-5" />
                <span className="font-bold">{totalItems}</span>
              </div>
            </button>
          </div>

          <div className="hidden md:block fixed bottom-8 right-8 z-40">
            <button
              onClick={() => setIsCartOpen(true)}
              className={`bg-italian-green text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-all hover:bg-green-700 group relative ${isCartAnimating ? 'scale-125 bg-green-600' : ''}`}
            >
              <ShoppingBag className={`w-8 h-8 group-hover:animate-pulse ${isCartAnimating ? 'animate-bounce' : ''}`} />
              <span className="absolute -top-2 -right-2 bg-italian-red text-white text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-white">
                {totalItems}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;