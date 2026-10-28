import { supabase } from './supabaseClient.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Calls the Node backend. For admin (protected) routes we attach the
 * current Supabase access token so the backend — and, in turn, Postgres
 * RLS — knows who's asking. Public routes work fine with no session too.
 */
export async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Not signed in');
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }
  return payload;
}

export const KHMER_NAME_OVERRIDES = {
  'កាត់សក់បុរសទូទៅ (Classic Haircut)': 'កាត់សក់បុរសទូទៅ',
  'កាត់សក់ហ្វេត + ផ្លុំសិត (Skin Fade & Styling)': 'កាត់សក់ហ្វេត + ផ្លុំសិត',
  'កាត់សក់កុមារ (Kids Haircut)': 'កាត់សក់កុមារ',
  'កោរពុកមាត់ + កន្សែងក្តៅ (Hot Towel Shave)': 'កោរពុកមាត់ + កន្សែងក្តៅ',
  'កក់សក់ + ម៉ាស្សាក្បាល (Hair Wash & Scalp Massage)': 'កក់សក់ + ម៉ាស្សាក្បាល',
  'ប្តូរពណ៌សក់ម៉ូត (Hair Color / Dye)': 'ប្តូរពណ៌សក់ម៉ូត',
  'ជែលសិតសក់ Matte Pomade (100g)': 'ជែលសិតសក់ម៉ូត (១០០ ក្រាម)',
  'ក្រមួនសិតសក់ Styling Clay Wax (80g)': 'ក្រមួនសិតសក់ (៨០ ក្រាម)',
  'ប្រេងបន្ទន់ពុកមាត់ Beard Oil (30ml)': 'ប្រេងបន្ទន់ពុកមាត់ (៣០ មីលីលីត្រ)',
};

export function cleanKhmerName(name) {
  if (!name) return '';
  if (KHMER_NAME_OVERRIDES[name]) return KHMER_NAME_OVERRIDES[name];
  return name.replace(/\s*\([A-Za-z0-9\s/&,.-]+\)/g, '').trim();
}

// ---- Public Salon Catalog & Barbers -----------------------------------------

export const getCategories = () => apiFetch('/categories');
export const getProducts = async (categoryId, itemType) => {
  const params = new URLSearchParams();
  if (categoryId) params.append('category_id', categoryId);
  if (itemType) params.append('item_type', itemType);
  const qs = params.toString();
  const list = await apiFetch(qs ? `/products?${qs}` : '/products');
  return (list || []).map((p) => ({ ...p, name: cleanKhmerName(p.name) }));
};
export const getProduct = async (id) => {
  const p = await apiFetch(`/products/${id}`);
  return p ? { ...p, name: cleanKhmerName(p.name) } : null;
};
export const getBarbers = () => apiFetch('/barbers');

// ---- Admin Staff / Barbers --------------------------------------------------

export const adminGetBarbers = () => apiFetch('/admin/barbers', { auth: true });
export const adminCreateBarber = (barber) =>
  apiFetch('/admin/barbers', { method: 'POST', body: barber, auth: true });
export const adminUpdateBarber = (id, barber) =>
  apiFetch(`/admin/barbers/${id}`, { method: 'PUT', body: barber, auth: true });
export const adminDeleteBarber = (id) =>
  apiFetch(`/admin/barbers/${id}`, { method: 'DELETE', auth: true });

// ---- Admin Queue / Active Chairs --------------------------------------------

export const adminGetQueue = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(qs ? `/admin/queue?${qs}` : '/admin/queue', { auth: true });
};
export const adminCreateQueueTicket = (ticket) =>
  apiFetch('/admin/queue', { method: 'POST', body: ticket, auth: true });
export const adminUpdateQueueTicket = (id, updates) =>
  apiFetch(`/admin/queue/${id}`, { method: 'PATCH', body: updates, auth: true });
export const adminDeleteQueueTicket = (id) =>
  apiFetch(`/admin/queue/${id}`, { method: 'DELETE', auth: true });

// ---- Admin Products & Services ----------------------------------------------

export async function adminUploadProductImage(file) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not signed in');

  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_URL}/admin/uploads/product-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error || `Upload failed (${res.status})`);
  }
  return payload;
}

export const adminGetProducts = async () => {
  const list = await apiFetch('/admin/products', { auth: true });
  return (list || []).map((p) => ({
    ...p,
    name: cleanKhmerName(p.name),
    categories: p.categories ? { ...p.categories, name: cleanKhmerName(p.categories.name) } : p.categories,
  }));
};
export const adminCreateProduct = (product) =>
  apiFetch('/admin/products', { method: 'POST', body: product, auth: true });
export const adminUpdateProduct = (id, product) =>
  apiFetch(`/admin/products/${id}`, { method: 'PUT', body: product, auth: true });
export const adminSetPublished = (id, published) =>
  apiFetch(`/admin/products/${id}/publish`, { method: 'PATCH', body: { published }, auth: true });
export const adminDeleteProduct = (id) =>
  apiFetch(`/admin/products/${id}`, { method: 'DELETE', auth: true });

export const adminCreateCategory = (name) =>
  apiFetch('/admin/categories', { method: 'POST', body: { name }, auth: true });
export const adminUpdateCategory = (id, name) =>
  apiFetch(`/admin/categories/${id}`, { method: 'PUT', body: { name }, auth: true });
export const adminDeleteCategory = (id) =>
  apiFetch(`/admin/categories/${id}`, { method: 'DELETE', auth: true });

// ---- Admin Sales & Checkout -------------------------------------------------

export const adminCreateSale = (items, details = {}) =>
  apiFetch('/admin/sales', { method: 'POST', body: { items, details }, auth: true });
export const adminGetSales = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const list = await apiFetch(qs ? `/admin/sales?${qs}` : '/admin/sales', { auth: true });
  return (list || []).map((sale) => ({
    ...sale,
    sale_items: sale.sale_items?.map((item) => ({
      ...item,
      product_name: cleanKhmerName(item.product_name),
    })),
  }));
};
export const adminUpdateSale = (id, sale) =>
  apiFetch(`/admin/sales/${id}`, { method: 'PUT', body: sale, auth: true });
export const adminDeleteSale = (id) =>
  apiFetch(`/admin/sales/${id}`, { method: 'DELETE', auth: true });

export const adminGetDashboard = async () => {
  const stats = await apiFetch('/admin/dashboard', { auth: true });
  if (stats?.top_services_30d) {
    stats.top_services_30d = stats.top_services_30d.map((s) => ({
      ...s,
      name: cleanKhmerName(s.name),
    }));
  }
  return stats;
};
