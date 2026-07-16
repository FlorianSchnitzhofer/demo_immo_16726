// Typisierter Zugriff auf die REST-API

export type User = { id: number; email: string; name: string; role: string };

export type Property = {
  id: number;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  year_built: number | null;
  notes: string;
  unit_count?: number;
  total_area?: number;
  vacant_count?: number;
};

export type Unit = {
  id: number;
  property_id: number;
  top_number: string;
  type: 'wohnung' | 'geschaeft' | 'stellplatz';
  area_m2: number;
  floor: string;
  rooms: number | null;
  property_name?: string;
  tenancy_id?: number | null;
  tenant_name?: string | null;
  net_rent?: number | null;
  bk_akonto?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type PropertyDetail = Property & { units: Unit[] };

export type Tenancy = {
  id: number;
  unit_id: number;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  start_date: string;
  end_date: string | null;
  net_rent: number;
  bk_akonto: number;
  deposit: number;
  top_number: string;
  unit_type: string;
  area_m2: number;
  property_id: number;
  property_name: string;
  active: boolean;
};

export type Invoice = {
  id: number;
  tenancy_id: number;
  year: number;
  month: number;
  net_rent: number;
  bk_akonto: number;
  total: number;
  due_date: string;
  status: 'offen' | 'bezahlt';
  paid_at: string | null;
  overdue: boolean;
  tenant_name: string;
  top_number: string;
  property_id: number;
  property_name: string;
};

export type OperatingCost = {
  id: number;
  property_id: number;
  year: number;
  category: string;
  description: string;
  amount: number;
};

export type Provider = {
  id: number;
  name: string;
  contact_email: string;
  phone: string;
  categories: string;
  order_count?: number;
  active_orders?: number;
};

export type OrderEvent = { status: string; created_at: string };

export type Ticket = {
  id: number;
  property_id: number;
  unit_id: number | null;
  category: 'reinigung' | 'wartung' | 'reparatur' | 'winterdienst';
  title: string;
  description: string;
  priority: 'niedrig' | 'mittel' | 'hoch';
  status: 'offen' | 'beauftragt' | 'abgeschlossen';
  created_at: string;
  property_name: string;
  top_number: string | null;
  order_id: number | null;
  order_status: 'angefragt' | 'beauftragt' | 'in_arbeit' | 'abgeschlossen' | null;
  order_amount: number | null;
  provider_id: number | null;
  provider_name: string | null;
  order_events?: OrderEvent[];
};

export type DashboardData = {
  property_count: number;
  unit_count: number;
  total_area: number;
  vacant_count: number;
  active_tenancies: number;
  monthly_target: number;
  open_count: number;
  open_amount: number;
  overdue_count: number;
  overdue_amount: number;
  open_tickets: number;
  assigned_tickets: number;
  months: { year: number; month: number; prescribed: number; paid: number }[];
  occupancy: { type: string; total: number; rented: number }[];
};

export type BkTenancyAllocation = {
  tenancy_id: number;
  tenant_name: string;
  months: number;
  akonto: number;
  cost_share: number;
  saldo: number;
};

export type BkAllocation = {
  unit_id: number;
  top_number: string;
  type: string;
  area_m2: number;
  unit_share: number;
  owner_share: number;
  tenancies: BkTenancyAllocation[];
};

export type BkAbrechnung = {
  property_id: number;
  year: number;
  total_costs: number;
  total_area: number;
  cost_per_m2: number;
  costs: OperatingCost[];
  allocations: BkAllocation[];
};

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = `Fehler ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* Antwort war kein JSON */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
