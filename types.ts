

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
  neighborhoods?: string[]; // List of neighborhood names matching this region
}

// --- NEW TYPES FOR PHASE 1 & 2 ---

export interface TimeInterval {
  start: string; // "18:00"
  end: string;   // "23:00"
}

export interface DaySchedule {
  isOpen: boolean;
  intervals: TimeInterval[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface StoreColors {
  primary: string;   // Replaces italian-red
  secondary: string; // Replaces italian-green
  background?: string;
}

export interface StoreSettings {
  name: string;
  logoUrl: string;
  whatsapp: string;
  address: string;
  
  // Legacy support (simple string), will be deprecated in favor of schedule
  openingHours: string; 
  
  // New Advanced Schedule
  schedule?: WeeklySchedule;
  
  phones: string[];
  paymentMethods: string[]; 
  deliveryRegions?: DeliveryRegion[];
  enableGuide?: boolean; 
  freeShipping?: boolean; 
  
  // Localization & Currency
  currencySymbol?: string; // R$, €, $
  timezone?: string; // America/Sao_Paulo
  
  // Visual Identity
  colors?: StoreColors;

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
  customer_phone?: string; 
  delivery_type: 'delivery' | 'pickup';
  address_street?: string;
  address_number?: string;
  address_district?: string;
  address_city?: string;
  address_complement?: string;
  payment_method: string;
  total: number;
  delivery_fee: number;
  discount: number;
  coupon_code?: string; 
  status: OrderStatus;
  items: any[]; 
  observation?: string;
}