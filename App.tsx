import React, { useState, useEffect } from 'react';
import { MENU_DATA, DEFAULT_SETTINGS, CATEGORY_IMAGES } from './data';
import { Product, CartItem, Category, StoreSettings } from './types';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { PromoBanner } from './components/PromoBanner';
import { InfoModal } from './components/InfoModal';
import { OnboardingGuide } from './components/OnboardingGuide';
import { ShoppingBag, Check, Loader2, Search, X, Filter, Clock, AlertCircle, HelpCircle } from 'lucide-react';
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

// Helper to parse opening hours loosely (e.g. "18h às 23h")
const checkStoreOpen = (hoursString: string): { isOpen: boolean, message: string } => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Extract numbers using regex (looks for patterns like 18h, 18:00, etc)
  const times = hoursString.match(/(\d{1,2})/g);
  
  if (times && times.length >= 2) {
    const startHour = parseInt(times[0]);
    const endHour = parseInt(times[1]);
    
    // Simple logic for same-day shifts (e.g. 18 to 23)
    // Does not handle cross-midnight shifts perfectly (e.g. 18 to 02) without more logic
    // but serves for the default "18h às 23h"
    if (endHour > startHour) {
       if (currentHour >= startHour && currentHour < endHour) {
         return { isOpen: true, message: 'Aberto Agora' };
       }
    } else {
       // Cross midnight (e.g. 18 to 02)
       if (currentHour >= startHour || currentHour < endHour) {
         return { isOpen: true, message: 'Aberto Agora' };
       }
    }
    
    return { isOpen: false, message: `Fechado no momento. Abrimos às ${startHour}h.` };
  }
  
  // Fallback if format is not understandable
  return { isOpen: true, message: '' };
};

function App() {
  const [menuData, setMenuData] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('all'); // 'all' or categoryId

  // Info Modal State
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [storeStatus, setStoreStatus] = useState({ isOpen: true, message: '' });

  // Guide State
  const [showGuide, setShowGuide] = useState(false);

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

  // Check store status when settings load
  useEffect(() => {
     if (storeSettings.openingHours) {
        setStoreStatus(checkStoreOpen(storeSettings.openingHours));
     }
     
     // Check if guide should be shown
     if (storeSettings.enableGuide !== false) {
       const hasSeenGuide = localStorage.getItem('hasSeenGuide_v1');
       if (!hasSeenGuide) {
         // Small delay to let UI render
         setTimeout(() => setShowGuide(true), 1500);
       }
     }
  }, [storeSettings]);

  const closeGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenGuide_v1', 'true');
  };

  const restartGuide = () => {
    setShowGuide(true);
  };

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
          image: cat.image || CATEGORY_IMAGES[cat.id] || null, // Fallback image logic
          items: products
            .filter((prod: any) => prod.category_id === cat.id)
            .sort((a: any, b: any) => a.id - b.id)
            .map((prod: any) => {
              // Parse options if string, or keep as is
              let opts = prod.options;
              if (typeof opts === 'string') {
                try { opts = JSON.parse(opts); } catch(e) { opts = []; }
              }
              // Ensure ingredients is an array
              const ingredients = Array.isArray(prod.ingredients) ? prod.ingredients : [];
              return { ...prod, options: opts || [], ingredients };
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
            paymentMethods: (settingsData.payment_methods && Array.isArray(settingsData.payment_methods)) ? settingsData.payment_methods : DEFAULT_SETTINGS.paymentMethods,
            deliveryRegions: Array.isArray(deliveryRegions) ? deliveryRegions : DEFAULT_SETTINGS.deliveryRegions,
            enableGuide: settingsData.enable_guide ?? true
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
    // ... (Keep existing implementation)
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
      const payload: any = {
        name: updates.name,
        price: updates.price,
        description: updates.description,
        image: updates.image,
        category_id: updates.category,
        code: updates.code,
        subcategory: updates.subcategory,
        ingredients: updates.ingredients
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
    // ... (Keep existing implementation)
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
          subcategory: product.subcategory,
          options: product.options ? JSON.stringify(product.options) : '[]',
          ingredients: product.ingredients || []
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
    // ... (Keep existing implementation)
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

  const handleUpdateCategory = async (id: string, updates: { name?: string; image?: string }) => {
    // Optimistic update
    setMenuData(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, ...updates };
      }
      return c;
    }));

    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar categoria:", err);
      fetchData(); // Revert on error
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Tem certeza? Isso apagará a categoria e TODOS os produtos nela.')) {
      setMenuData(prev => prev.filter(c => c.id !== id));
      
      if (!supabase) return;
      
      try {
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
          delivery_regions: deliveryRegionsJson,
          enable_guide: newSettings.enableGuide,
          payment_methods: newSettings.paymentMethods
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
    if (!storeStatus.isOpen && view === 'customer') {
       alert(`A loja está fechada no momento. Horário: ${storeSettings.openingHours}`);
       return;
    }

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
    // ... (Keep existing implementation)
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
    // ... (Keep existing implementation)
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
      const headerOffset = 200; // Adjusted offset for larger nav
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

  // FILTERING LOGIC
  const displayCategories = menuData
    .map(cat => {
      // 1. Filter items by Search Term
      const filteredItems = cat.items.filter(item => {
         if (searchTerm) {
            // Helper to normalize strings (remove accents, lowercase) for better search
            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            // Break search term into words (tokens)
            const searchTerms = normalize(searchTerm).split(/\s+/).filter(t => t.length > 0);
            
            if (searchTerms.length === 0) return true;

            // Create a single searchable string containing all relevant product info
            const itemSearchableText = normalize(
               [
                  item.name,
                  item.description || '',
                  item.code || '',
                  item.subcategory || '',
                  (item.ingredients || []).join(' '),
                  cat.name // Added category name to search scope
               ].join(' ')
            );

            // AND Logic: The item must contain ALL typed words (in any order)
            return searchTerms.every(term => itemSearchableText.includes(term));
         }
         return true;
      });
      return { ...cat, items: filteredItems };
    })
    .filter(cat => {
       // 2. Scope Filter: If a scope is selected, ONLY show that category
       if (searchScope !== 'all' && cat.id !== searchScope) return false;
       
       // 3. Hide 'promocoes' from main list unless we are searching
       // This allows finding promo items via search bar
       if (cat.id === 'promocoes' && !searchTerm) return false;
       
       return true;
    });

  const navCategories = menuData
    .filter(cat => cat.id !== 'promocoes')
    .filter(cat => searchScope === 'all' || cat.id === searchScope);

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
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onResetMenu={handleResetMenu}
        onBack={() => setView('customer')}
      />
    );
  }

  // To highlight the first product card for the tour, we find the first available item in the filtered list
  let firstProductFound = false;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 pb-24 md:pb-0 font-sans relative transition-colors duration-300">
      
      {/* ONBOARDING GUIDE */}
      {showGuide && <OnboardingGuide onClose={closeGuide} />}

      {/* CLOSED STORE BANNER */}
      {!storeStatus.isOpen && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top sticky top-0 z-50">
          <Clock className="w-4 h-4" />
          {storeStatus.message}
        </div>
      )}

      <Header 
        cartCount={totalItems} 
        onOpenCart={() => setIsCartOpen(true)} 
        animateCart={isCartAnimating}
        storeName={storeSettings.name}
        logoUrl={storeSettings.logoUrl}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        whatsapp={storeSettings.whatsapp}
        phone={storeSettings.phones[0] || ''}
        onOpenInfo={() => setIsInfoModalOpen(true)}
        isOpenNow={storeStatus.isOpen}
      />
      
      {error && (
        <div className="bg-yellow-100 border-b border-yellow-200 text-yellow-800 px-4 py-2 text-xs text-center dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800">
          {error}
        </div>
      )}
      
      <CategoryNav 
        categories={navCategories} 
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
      />

      <main className="max-w-5xl mx-auto px-4 pt-6">
        
        {/* Search Bar & Scope Selector */}
        <div id="tour-search" className="relative w-full max-w-2xl mx-auto mb-6 flex flex-col md:flex-row gap-3">
           <div className="relative flex-1">
              <input 
                 type="text"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Buscar por nome, ingrediente ou código..."
                 className="w-full pl-10 pr-10 py-3 bg-white border border-stone-200 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-italian-green dark:bg-stone-800 dark:border-stone-700 dark:text-white"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              {searchTerm && (
                 <button 
                   onClick={() => setSearchTerm('')}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                 >
                   <X className="w-4 h-4" />
                 </button>
              )}
           </div>
           
           <div className="relative min-w-[160px]">
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter className="w-4 h-4 text-stone-500" />
             </div>
             <select
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value)}
                className="w-full h-full pl-9 pr-8 py-3 bg-white border border-stone-200 rounded-xl shadow-sm text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-italian-green dark:bg-stone-800 dark:border-stone-700 dark:text-white cursor-pointer"
             >
                <option value="all">Todas Categorias</option>
                {menuData.filter(c => c.id !== 'promocoes').map(cat => (
                   <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
             </select>
             <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
           </div>
        </div>

        {/* Banner de Promoções */}
        {!searchTerm && searchScope === 'all' && activePromotions.length > 0 && (
          <PromoBanner 
            promotions={activePromotions}
            onAddToCart={(p) => addToCart(p, 1, '')}
          />
        )}

        {/* Fallback Banner */}
        {!searchTerm && searchScope === 'all' && activePromotions.length === 0 && (
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl p-6 mb-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 dark:from-black dark:to-stone-900 dark:border dark:border-stone-800">
            <div className="space-y-2 text-center md:text-left">
              <span className="bg-italian-red text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Bem-vindo</span>
              <h2 className="text-3xl font-display">Bateu a fome?</h2>
              <p className="text-stone-300 max-w-md">
                Escolha sua pizza favorita e receba no conforto da sua casa. 
              </p>
            </div>
            {storeStatus.isOpen ? (
               <button onClick={() => {
                  const el = document.getElementById(displayCategories[0]?.items.length ? `category-${displayCategories[0].id}` : 'root');
                  el?.scrollIntoView({ behavior: 'smooth' });
               }} className="bg-white text-stone-900 px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform">
                  Ver Cardápio
               </button>
            ) : (
               <div className="bg-red-500/20 border border-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" /> {storeStatus.message}
               </div>
            )}
          </div>
        )}

        {/* Content Loop */}
        <div className="space-y-10">
          {displayCategories.map((category) => {
            // Group items by subcategory
            const hasSubcategories = category.items.some(item => !!item.subcategory);
            const groupedItems: Record<string, Product[]> = {};
            let ungroupedItems: Product[] = [];

            if (hasSubcategories) {
               category.items.forEach(item => {
                  if (item.subcategory) {
                     if (!groupedItems[item.subcategory]) groupedItems[item.subcategory] = [];
                     groupedItems[item.subcategory].push(item);
                  } else {
                     ungroupedItems.push(item);
                  }
               });
            }

            return (
              <section 
                key={category.id} 
                id={`category-${category.id}`}
                className="scroll-mt-64"
              >
                <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-4 pl-2 border-l-4 border-italian-red flex items-center gap-2">
                  {category.name}
                  {searchTerm && category.items.length > 0 && (
                    <span className="text-xs bg-italian-green text-white px-2 py-0.5 rounded-full font-normal">
                        {category.items.length} resultados
                    </span>
                  )}
                </h2>
                
                {category.items.length > 0 ? (
                   hasSubcategories ? (
                      <div className="space-y-6">
                         {/* Ungrouped Items First */}
                         {ungroupedItems.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {ungroupedItems.map((product) => {
                                const isFirst = !firstProductFound;
                                if (isFirst) firstProductFound = true;
                                return (
                                  <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onAddToCart={addToCart} 
                                    id={isFirst ? "tour-product-card" : undefined}
                                  />
                                );
                              })}
                            </div>
                         )}
                         
                         {/* Grouped Items */}
                         {Object.entries(groupedItems).map(([sub, products]) => (
                            <div key={sub}>
                               <h3 className="text-lg font-bold text-stone-600 dark:text-stone-400 mb-3 ml-1 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-stone-400 rounded-full"></span>
                                  {sub}
                               </h3>
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {products.map((product) => {
                                    const isFirst = !firstProductFound;
                                    if (isFirst) firstProductFound = true;
                                    return (
                                      <ProductCard 
                                        key={product.id} 
                                        product={product} 
                                        onAddToCart={addToCart} 
                                        id={isFirst ? "tour-product-card" : undefined}
                                      />
                                    );
                                  })}
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.items.map((product) => {
                          const isFirst = !firstProductFound;
                          if (isFirst) firstProductFound = true;
                          return (
                            <ProductCard 
                              key={product.id} 
                              product={product} 
                              onAddToCart={addToCart} 
                              id={isFirst ? "tour-product-card" : undefined}
                            />
                          );
                        })}
                      </div>
                   )
                ) : (
                   <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 text-center dark:bg-stone-800 dark:border-stone-700">
                      <p className="text-stone-500 font-medium dark:text-stone-400">
                         Nenhum produto encontrado nesta categoria para "{searchTerm}".
                      </p>
                   </div>
                )}
              </section>
            );
          })}
        </div>
      </main>

      <Footer 
        onOpenAdmin={() => setView('admin')} 
        settings={storeSettings}
      />
      
      {/* Help/Guide Button in Footer/Bottom area */}
      {storeSettings.enableGuide && (
         <div className="fixed bottom-24 left-4 md:bottom-8 md:left-8 z-30">
             <button 
               onClick={restartGuide}
               className="bg-white text-italian-green p-2 rounded-full shadow-lg border border-stone-200 hover:scale-105 transition-transform"
               title="Ajuda / Tutorial"
             >
                <HelpCircle className="w-6 h-6" />
             </button>
         </div>
      )}

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
        paymentMethods={storeSettings.paymentMethods}
      />

      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        settings={storeSettings}
        isOpenNow={storeStatus.isOpen}
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