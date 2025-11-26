

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
  ingredients?: string[]; // New field for product ingredients
  tags?: string[]; // New field for filtering tags
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
  zipRules?: string[]; // Can be a prefix (13295), full CEP (13295000) or range (13295000-13299999)
  zipExclusions?: string[]; // Rules for CEPs to exclude from this region
}

export interface StoreSettings {
  name: string;
  logoUrl: string;
  whatsapp: string;
  address: string;
  openingHours: string;
  phones: string[];
  paymentMethods: string[]; // New field for dynamic payment methods
  deliveryRegions?: DeliveryRegion[];
  enableGuide?: boolean; // New field to toggle onboarding tour
  freeShipping?: boolean; // New field for global free shipping toggle
  
  // SEO & Social Sharing
  seoTitle?: string;
  seoDescription?: string;
  seoBannerUrl?: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_percent: number;
  active: boolean;
  created_at?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'delivery' | 'completed' | 'cancelled';

export interface Order {
  id: number;
  created_at: string;
  customer_name: string;
  customer_phone?: string; // Optional, maybe captured later or via login
  delivery_type: 'delivery' | 'pickup';
  address_street?: string;
  address_number?: string;
  address_district?: string;
  address_city?: string;
  address_complement?: string;
  payment_method: string;
  total: number;
  delivery_fee: number;
  discount: number; // New field
  coupon_code?: string; // New field
  status: OrderStatus;
  items: any[]; // JSONB content of items for simplicity in archiving
  observation?: string;
}