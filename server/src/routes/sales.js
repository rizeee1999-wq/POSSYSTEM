import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/sales — ring up a sale.
// body: { items: [{ product_id: 1, quantity: 2 }, ...] }
//
// Delegates to the create_sale() Postgres function (see supabase/schema.sql)
// so the stock decrement + sale + line items are one atomic transaction.
router.post('/admin/sales', requireAdmin, async (req, res) => {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const { data, error } = await req.supabase.rpc('create_sale', { items });

  if (error) return res.status(400).json({ error: error.message });

  // data is the new sale's id — fetch it back with its line items for the receipt.
  const { data: sale, error: fetchError } = await req.supabase
    .from('sales')
    .select('*, sale_items(*)')
    .eq('id', data)
    .single();

  if (fetchError) return res.status(500).json({ error: fetchError.message });
  res.status(201).json(sale);
});

// GET /api/admin/sales — recent sale history, newest first.
router.get('/admin/sales', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const { data, error } = await req.supabase
    .from('sales')
    .select('*, sale_items(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/admin/sales/:id — update the sale date and line items.
router.put('/admin/sales/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { created_at, items } = req.body || {};

  if (!created_at) {
    return res.status(400).json({ error: 'created_at is required' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const normalizedItems = items.map((item) => {
    const product_name = String(item.product_name || '').trim();
    const quantity = Number(item.quantity);
    const unit_price = Number(item.unit_price ?? 0);

    if (!product_name) {
      throw new Error('Each item must have a product name');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Each item quantity must be greater than zero');
    }
    if (!Number.isFinite(unit_price) || unit_price < 0) {
      throw new Error('Each item price must be valid');
    }

    return {
      product_id: item.product_id ?? null,
      product_name,
      quantity,
      unit_price,
      line_total: Number((unit_price * quantity).toFixed(2)),
    };
  });

  const total = normalizedItems.reduce((sum, item) => sum + Number(item.line_total), 0);

  try {
    const { error: saleError } = await req.supabase
      .from('sales')
      .update({ created_at: new Date(created_at).toISOString(), total })
      .eq('id', id);

    if (saleError) return res.status(400).json({ error: saleError.message });

    const { error: deleteError } = await req.supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (deleteError) return res.status(400).json({ error: deleteError.message });

    const rows = normalizedItems.map((item) => ({
      sale_id: Number(id),
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }));

    const { data, error: insertError } = await req.supabase
      .from('sale_items')
      .insert(rows)
      .select();

    if (insertError) return res.status(400).json({ error: insertError.message });

    const { data: sale, error: fetchError } = await req.supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('id', id)
      .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });
    res.json(sale);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/sales/:id
router.delete('/admin/sales/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await req.supabase.from('sales').delete().eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
