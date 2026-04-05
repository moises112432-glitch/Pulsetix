export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  stripe_onboarding_complete: boolean;
}

export interface TicketType {
  id: number;
  name: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  tier_order: number;
}

export interface Event {
  id: number;
  organizer_id: number;
  organizer_name: string | null;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  cover_image: string | null;
  status: string;
  affiliate_enabled: boolean;
  affiliate_commission_percent: number | null;
  created_at: string;
  ticket_types: TicketType[];
}

export interface EventListItem {
  id: number;
  title: string;
  location: string | null;
  start_time: string;
  cover_image: string | null;
  status: string;
  organizer_id: number;
  affiliate_enabled: boolean;
  affiliate_commission_percent: number | null;
}

export interface Ticket {
  id: number;
  ticket_type_name: string;
  qr_code_token: string;
  checked_in_at: string | null;
}

export interface Order {
  id: number;
  event_id: number;
  total: number;
  status: string;
  created_at: string;
  tickets: Ticket[];
}

export interface PromoCode {
  id: number;
  event_id: number;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  times_used: number;
  active: boolean;
  created_at: string;
}

export interface PromoterSignup {
  id: number;
  referral_code: string;
  referral_url: string;
}

export interface PromoterDashboard {
  event_id: number;
  event_title: string;
  referral_code: string;
  referral_url: string;
  commission_percent: number;
  total_sales: number;
  total_revenue: number;
  total_commission: number;
  pending_commission: number;
}

export interface Promoter {
  id: number;
  user_id: number;
  user_name: string;
  event_id: number;
  referral_code: string;
  created_at: string;
  total_sales: number;
  total_revenue: number;
  total_commission: number;
}

export interface Commission {
  id: number;
  promoter_id: number;
  order_id: number;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}
