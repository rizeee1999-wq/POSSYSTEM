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

// ---- Public Salon Catalog & Barbers -----------------------------------------

export const getCategories = () => apiFetch('/categories');
export const getProducts = (categoryId, itemType) => {
  const params = new URLSearchParams();
  if (categoryId) params.append('category_id', categoryId);
  if (itemType) params.append('item_type', itemType);
  const qs = params.toString();
  return apiFetch(qs ? `/products?${qs}` : '/products');
};
export const getProduct = (id) => apiFetch(`/products/${id}`);
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

export const adminGetProducts = () => apiFetch('/admin/products', { auth: true });
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

// ---- Admin Sales & Checkout -------------------------------------------------

export const adminCreateSale = (items, details = {}) =>
  apiFetch('/admin/sales', { method: 'POST', body: { items, details }, auth: true });
export const adminGetSales = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(qs ? `/admin/sales?${qs}` : '/admin/sales', { auth: true });
};
export const adminUpdateSale = (id, sale) =>
  apiFetch(`/admin/sales/${id}`, { method: 'PUT', body: sale, auth: true });
export const adminDeleteSale = (id) =>
  apiFetch(`/admin/sales/${id}`, { method: 'DELETE', auth: true });

export const adminGetDashboard = () => apiFetch('/admin/dashboard', { auth: true });
