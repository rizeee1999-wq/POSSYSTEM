import { Router } from 'express';
import { publicClient } from '../supabaseClient.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const KHMER_NAME_OVERRIDES = {
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

function cleanKhmerName(name) {
  if (!name) return '';
  if (KHMER_NAME_OVERRIDES[name]) return KHMER_NAME_OVERRIDES[name];
  return name.replace(/\s*\([A-Za-z0-9\s/&,.-]+\)/g, '').trim();
}

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

  const sanitized = (data || []).map((p) => ({
    ...p,
    name: cleanKhmerName(p.name),
  }));
  res.json(sanitized);
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
  res.json({
    ...data,
    name: cleanKhmerName(data.name),
  });
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

  // Asynchronously clean up any product in database that still contains English
  for (const p of data || []) {
    const cleaned = cleanKhmerName(p.name);
    if (cleaned !== p.name) {
      req.supabase.from('products').update({ name: cleaned }).eq('id', p.id).then(() => {}).catch(() => {});
      p.name = cleaned;
    }
  }

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

// POST /api/admin/products/:id/restock
router.post('/admin/products/:id/restock', requireAdmin, async (req, res) => {
  const { quantity, added_at, note } = req.body || {};
  const qty = Number(quantity);
  if (!qty || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number' });
  }

  // 1. Fetch current product
  const { data: product, error: fetchErr } = await req.supabase
    .from('products')
    .select('id, name, stock, item_type')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const currentStock = Number(product.stock || 0);
  const newStock = currentStock + qty;

  // 2. Update product stock
  const { data: updatedProduct, error: updateErr } = await req.supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', req.params.id)
    .select('*, categories(name)')
    .single();

  if (updateErr) return res.status(400).json({ error: updateErr.message });

  // 3. Insert stock log
  const logEntry = {
    product_id: Number(req.params.id),
    quantity_added: qty,
    stock_after: newStock,
    note: note ? String(note).trim() : null,
    added_at: added_at ? new Date(added_at).toISOString() : new Date().toISOString(),
  };

  const { data: logData, error: logErr } = await req.supabase
    .from('product_stock_logs')
    .insert(logEntry)
    .select()
    .single();

  if (logErr) {
    console.warn('Warning: product_stock_logs insert failed (table may not be created yet):', logErr.message);
  }

  res.status(200).json({
    product: updatedProduct,
    log: logData || logEntry,
    warning: logErr ? logErr.message : undefined,
  });
});

// GET /api/admin/products/:id/stock-logs
router.get('/admin/products/:id/stock-logs', requireAdmin, async (req, res) => {
  const { data, error } = await req.supabase
    .from('product_stock_logs')
    .select('*')
    .eq('product_id', req.params.id)
    .order('added_at', { ascending: false });

  if (error) {
    return res.json([]);
  }

  res.json(data || []);
});

export default router;
