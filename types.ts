export interface ProductChoice {
  name: string;
  price: number;
}

export interface ProductOption {
  id: string; // unique internal id for keying
  name: string; // e.g. "Escolha a Borda"
  type: 'single' | 'multiple'; // single (radio) or multiple (checkbox)
  required: boolean;
  choices: ProductChoice[];
}

export interface Product {
  id: number;
  code?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  category_id?: string;
  subcategory?: string; // New field for grouping (e.g. "Long Neck", "Lata")
  image?: string;
  options?: ProductOption[]; // New field for customization
}

export interface Category {
  id: string;
  name: string;
  items: Product[];
  image?: string; // New field for category navigation image
}

export interface CartItem extends Product {
  quantity: number;
  observation?: string;
  selectedOptions?: { // Store what the user actually picked
    groupName: string;
    choiceName: string;
    price: number;
  }[];
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

export interface DeliveryRegion {
  id: string;
  name: string;
  price: number;
  zipPrefixes?: string[];
}

export interface StoreSettings {
  name: string;
  logoUrl: string;
  whatsapp: string;
  address: string;
  openingHours: string;
  phones: string[];
  deliveryRegions?: DeliveryRegion[];
  enableGuide?: boolean; // New field to toggle onboarding tour
}