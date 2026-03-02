export type LeadTier = 'hot' | 'warm' | 'cold' | 'skip';

export type WebsiteStatus =
  | 'no_website'
  | 'dead'
  | 'parked'
  | 'facebook_only'
  | 'placeholder'
  | 'free_tier'
  | 'poor'
  | 'adequate';

export type OutreachStatus =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'meeting_set'
  | 'closed_won'
  | 'closed_lost';

export type FranchiseFlag = 'none' | 'likely_franchise' | 'definite_franchise';

export interface Lead {
  id: number;
  google_place_id: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  website_url: string | null;
  website_status: WebsiteStatus | null;
  google_rating: number | null;
  google_review_count: number | null;
  has_yelp: 'true' | 'false' | 'unknown';
  yelp_url: string | null;
  franchise_score: number;
  franchise_flag: FranchiseFlag;
  lead_score: number;
  lead_tier: LeadTier;
  trades: string | null;
  outreach_status: OutreachStatus;
  notes: string | null;
  first_seen: string;
  last_enriched: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallLogEntry {
  id: number;
  business_id: number;
  called_at: string;
  duration_seconds: number | null;
  outcome: string;
  notes: string | null;
  created_at: string;
}

export interface Scan {
  id: number;
  trades: string;
  towns: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_found: number;
  new_inserted: number;
  updated: number;
  hot_count: number;
  warm_count: number;
  cold_count: number;
  skip_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  current_phase: string | null;
  phase_detail: string | null;
  progress: number;
  items_done: number;
  items_total: number;
}

export interface LeadFilters {
  search?: string;
  tier?: LeadTier[];
  trade?: string;
  city?: string;
  website_status?: WebsiteStatus[];
  outreach_status?: OutreachStatus[];
  min_score?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalLeads: number;
  byTier: Record<LeadTier, number>;
  byWebsiteStatus: Record<string, number>;
  byOutreachStatus: Record<string, number>;
  recentScans: Scan[];
  byCity: { city: string; count: number }[];
  byTrade: { trade: string; count: number }[];
}

export interface FollowUp {
  id: number;
  business_id: number;
  due_date: string;
  note: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface WebsiteAudit {
  id: number;
  business_id: number;
  url: string;
  status_code: number | null;
  load_time_ms: number | null;
  is_mobile_friendly: boolean | null;
  has_ssl: boolean | null;
  has_contact_form: boolean | null;
  has_phone_number: boolean | null;
  tech_stack: string | null;
  audit_score: number | null;
  raw_data: string | null;
  audited_at: string;
}

export type SortOrder = 'asc' | 'desc';

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface ToastMessage {
  id: string;
  variant: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
