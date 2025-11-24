import React, { useState, useEffect } from 'react';
import { MENU_DATA, DEFAULT_SETTINGS } from './data';
import { Product, CartItem, Category, StoreSettings } from './types';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { PromoBanner } from './components/PromoBanner';
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

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

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
    // If promocoes exists, don't set it as default active, pick the second one if available
    if (menuData.length > 0 && !activeCategory) {
      const firstContentCategory = menuData.find(c => c.id !== 'promocoes') || menuData[0];
      setActiveCategory(firstContentCategory.id);
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

  // --- CATEGORY ACTIONS ---
  const handleAddCategory = async (name: string) => {
    const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newCategory: Category = { id, name, items: [] };

    setMenuData(prev => [...prev, newCategory]);

    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ id, name, order_index: menuData.length + 1 }]);
      
      if (error) throw error;
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Tem certeza? Isso apagará a categoria e TODOS os produtos nela.')) {
      setMenuData(prev => prev.filter(c => c.id !== id));
      
      if (!supabase) return;
      
      try {
        // Products cascade delete usually, but let's be safe if FK set
        await supabase.from('products').delete().eq('category_id', id);
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error(err);
        fetchData();
      }
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

  const addToCart = (product: Product, quantity: number = 1, observation: string = '', selectedOptions?: CartItem['selectedOptions']) => {
    const normalizedObservation = (observation || '').trim();
    
    // Create a unique key based on options to separate items
    const optionsKey = selectedOptions 
        ? JSON.stringify(selectedOptions.sort((a,b) => a.choiceName.localeCompare(b.choiceName))) 
        : '';

    setCartItems(prev => {
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

  // Extract promotions for the banner
  const promoCategory = menuData.find(c => c.id === 'promocoes');
  const activePromotions = promoCategory ? promoCategory.items : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-900 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-italian-red animate-spin" />
        <p className="text-stone-500 dark:text-stone-400 font-display">Carregando cardápio...</p>
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
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onResetMenu={handleResetMenu}
        onBack={() => setView('customer')}
      />
    );
  }

  // Filter out empty categories for the view
  const visibleCategories = menuData.filter(c => c.id !== 'promocoes' && c.items.length > 0);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 pb-24 md:pb-0 font-sans relative transition-colors duration-300">
      <Header 
        cartCount={totalItems} 
        onOpenCart={() => setIsCartOpen(true)} 
        animateCart={isCartAnimating}
        storeName={storeSettings.name}
        logoUrl={storeSettings.logoUrl}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
      
      {error && (
        <div className="bg-yellow-100 border-b border-yellow-200 text-yellow-800 px-4 py-2 text-xs text-center dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800">
          {error}
        </div>
      )}
      
      <CategoryNav 
        categories={visibleCategories} 
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
      />

      <main className="max-w-5xl mx-auto px-4 pt-6">
        
        {/* Banner de Promoções (Carrossel) */}
        {activePromotions.length > 0 && (
          <PromoBanner 
            promotions={activePromotions}
            onAddToCart={(p) => addToCart(p, 1, '')}
          />
        )}

        {/* Fallback Banner se não tiver promoções (opcional, ou remove se quiser) */}
        {activePromotions.length === 0 && (
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl p-6 mb-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 dark:from-black dark:to-stone-900 dark:border dark:border-stone-800">
            <div className="space-y-2 text-center md:text-left">
              <span className="bg-italian-red text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Bem-vindo</span>
              <h2 className="text-3xl font-display">Bateu a fome?</h2>
              <p className="text-stone-300 max-w-md">
                Escolha sua pizza favorita e receba no conforto da sua casa. 
              </p>
            </div>
          </div>
        )}

        <div className="space-y-10">
          {visibleCategories.map((category) => (
            <section 
              key={category.id} 
              id={`category-${category.id}`}
              className="scroll-mt-32"
            >
              <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-4 pl-2 border-l-4 border-italian-red">
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
              <span className="absolute -top-2 -right-2 bg-italian-red text-white text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-white dark:border-stone-800">
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
