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
