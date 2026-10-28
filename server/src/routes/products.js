import { Router } from 'express';
import { publicClient } from '../supabaseClient.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// Public catalog / Salon Menu — only ever returns published services & products
// ---------------------------------------------------------------------------

// GET /api/products?category_id=1&item_type=service
router.get('/products', async (req, res) => {
  let query = publicClient
    .from('products')
    .select('id, name, description, price, category_id, image_url, stock, item_type, duration_min, categories(name)')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (req.query.category_id) {
    query = query.eq('category_id', req.query.category_id);
  }
  if (req.query.item_type) {
    query = query.eq('item_type', req.query.item_type);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  const { data, error } = await publicClient
    .from('products')
    .select('id, name, description, price, category_id, image_url, stock, item_type, duration_min, categories(name)')
    .eq('published', true)
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Product or Service not found' });
  res.json(data);
});

// ---------------------------------------------------------------------------
// Admin — full CRUD over every product & haircut service
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

function validateProductFields({ name, price, stock, category_id, item_type }, { partial }) {
  if (!partial || name !== undefined) {
    if (!name || name.trim().length < 2) {
      return 'name must be at least 2 characters';
    }
  }
  if (!partial || price !== undefined) {
    if (price === undefined || Number(price) < 0) {
      return 'price must be 0 or greater';
    }
  }
  // Stock is only required for physical retail products, not for haircut services
  if (item_type === 'product' && (!partial || stock !== undefined)) {
    if (stock === undefined || Number(stock) < 0) {
      return 'stock must be 0 or greater for retail products';
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
  const {
    name,
    description,
    price,
    category_id,
    image_url,
    stock,
    published,
    item_type = 'service',
    duration_min = 30,
  } = req.body || {};

  const validationError = validateProductFields(
    { name, price, stock, category_id, item_type },
    { partial: false }
  );
  if (validationError) return res.status(400).json({ error: validationError });

  const finalStock = item_type === 'service' ? 999 : (stock !== undefined ? Number(stock) : 0);

  const { data, error } = await req.supabase
    .from('products')
    .insert({
      name: name.trim(),
      description: description || null,
      price: Number(price),
      category_id: category_id || null,
      image_url: image_url || null,
      item_type: item_type === 'product' ? 'product' : 'service',
      duration_min: item_type === 'service' ? Number(duration_min || 30) : 0,
      stock: finalStock,
      published: !!published,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/admin/products/:id
router.put('/admin/products/:id', requireAdmin, async (req, res) => {
  const {
    name,
    description,
    price,
    category_id,
    image_url,
    stock,
    published,
    item_type,
    duration_min,
  } = req.body || {};

  const validationError = validateProductFields(
    { name, price, stock, category_id, item_type },
    { partial: true }
  );
  if (validationError) return res.status(400).json({ error: validationError });

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = Number(price);
  if (category_id !== undefined) updates.category_id = category_id;
  if (image_url !== undefined) updates.image_url = image_url;
  if (item_type !== undefined) updates.item_type = item_type;
  if (duration_min !== undefined) updates.duration_min = Number(duration_min);
  if (stock !== undefined) updates.stock = Number(stock);
  if (published !== undefined) updates.published = Boolean(published);

  const { data, error } = await req.supabase
    .from('products')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// PATCH /api/admin/products/:id/publish
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
