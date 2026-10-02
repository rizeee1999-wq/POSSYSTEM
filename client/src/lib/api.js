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

// ---- Public catalog ---------------------------------------------------

export const getCategories = () => apiFetch('/categories');
export const getProducts = (categoryId) =>
  apiFetch(categoryId ? `/products?category_id=${categoryId}` : '/products');
export const getProduct = (id) => apiFetch(`/products/${id}`);

// ---- Admin --------------------------------------------------------------

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

export const adminCreateSale = (items) =>
  apiFetch('/admin/sales', { method: 'POST', body: { items }, auth: true });
export const adminGetSales = () => apiFetch('/admin/sales', { auth: true });
export const adminUpdateSale = (id, sale) =>
  apiFetch(`/admin/sales/${id}`, { method: 'PUT', body: sale, auth: true });
export const adminDeleteSale = (id) =>
  apiFetch(`/admin/sales/${id}`, { method: 'DELETE', auth: true });

export const adminGetDashboard = () => apiFetch('/admin/dashboard', { auth: true });
