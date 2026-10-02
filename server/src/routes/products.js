import { Router } from 'express';
import { publicClient } from '../supabaseClient.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// Public catalog — only ever returns published products (RLS enforces this
// too, so even a bug here can't leak drafts).
// ---------------------------------------------------------------------------

// GET /api/products?category_id=1
router.get('/products', async (req, res) => {
  let query = publicClient
    .from('products')
    .select('id, name, description, price, category_id, image_url, stock, categories(name)')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (req.query.category_id) {
    query = query.eq('category_id', req.query.category_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  const { data, error } = await publicClient
    .from('products')
    .select('id, name, description, price, category_id, image_url, stock, categories(name)')
    .eq('published', true)
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Product not found' });
  res.json(data);
});

// ---------------------------------------------------------------------------
// Admin — full CRUD over every product, published or not.
// ---------------------------------------------------------------------------

// GET /api/admin/products
router.get('/admin/products', requireAdmin, async (req, res) => {
  const { data, error } = await req.supabase
    .from('products')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Mirrors the client-side form rules so they can't be bypassed by calling
// the API directly. `partial` skips a field's check when it's absent from
// the request body (PUT allows partial updates).
function validateProductFields({ name, price, stock, category_id }, { partial }) {
  if (!partial || name !== undefined) {
    if (!name || name.trim().length <= 4) {
      return 'name must be more than 4 characters';
    }
  }
  if (!partial || price !== undefined) {
    if (price === undefined || Number(price) <= 1) {
      return 'price must be greater than 1';
    }
  }
  if (!partial || stock !== undefined) {
    if (stock === undefined || Number(stock) <= 1) {
      return 'stock must be greater than 1';
    }
  }
  if (!partial || category_id !== undefined) {
    if (!category_id) {
      return 'category_id is required';
    }
  }
  return null;
}

// POST /api/admin/products
router.post('/admin/products', requireAdmin, async (req, res) => {
  const { name, description, price, category_id, image_url, stock, published } = req.body || {};

  const validationError = validateProductFields({ name, price, stock, category_id }, { partial: false });
  if (validationError) return res.status(400).json({ error: validationError });

  const { data, error } = await req.supabase
    .from('products')
    .insert({
      name: name.trim(),
      description: description || null,
      price,
      category_id: category_id || null,
      image_url: image_url || null,
      stock: stock ?? 0,
      published: !!published,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/admin/products/:id
router.put('/admin/products/:id', requireAdmin, async (req, res) => {
  const { name, description, price, category_id, image_url, stock, published } = req.body || {};

  const validationError = validateProductFields({ name, price, stock, category_id }, { partial: true });
  if (validationError) return res.status(400).json({ error: validationError });

  const { data, error } = await req.supabase
    .from('products')
    .update({
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price }),
      ...(category_id !== undefined && { category_id }),
      ...(image_url !== undefined && { image_url }),
      ...(stock !== undefined && { stock }),
      ...(published !== undefined && { published }),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// PATCH /api/admin/products/:id/publish  { published: true|false }
// Convenience endpoint for the "post to client site" toggle.
router.patch('/admin/products/:id/publish', requireAdmin, async (req, res) => {
  const { published } = req.body || {};
  if (typeof published !== 'boolean') {
    return res.status(400).json({ error: 'published must be true or false' });
  }

  const { data, error } = await req.supabase
    .from('products')
    .update({ published })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/admin/products/:id
router.delete('/admin/products/:id', requireAdmin, async (req, res) => {
  const { error } = await req.supabase
    .from('products')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

export default router;
