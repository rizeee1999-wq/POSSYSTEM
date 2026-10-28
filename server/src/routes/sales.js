import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/sales — ring up a haircut service and/or retail sale
// body: {
//   items: [{ product_id: 1, quantity: 1, barber_id: 2, barber_name: "Dara" }],
//   details: { customer_name, customer_phone, barber_id, payment_method, tip, notes }
// }
router.post('/admin/sales', requireAdmin, async (req, res) => {
  const { items, details = {} } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  // Call the Postgres function create_sale(items, details)
  const { data, error } = await req.supabase.rpc('create_sale', {
    items,
    details: {
      customer_name: details.customer_name || 'អតិថិជនទូទៅ (Walk-in)',
      customer_phone: details.customer_phone || null,
      barber_id: details.barber_id ? Number(details.barber_id) : null,
      payment_method: details.payment_method || 'cash_usd',
      tip: Number(details.tip || 0),
      notes: details.notes || null,
    },
  });

  if (error) return res.status(400).json({ error: error.message });

  // data is the new sale's id — fetch it back with relations for the receipt.
  const { data: sale, error: fetchError } = await req.supabase
    .from('sales')
    .select('*, barbers(name, nickname, phone), sale_items(*)')
    .eq('id', data)
    .single();

  if (fetchError) return res.status(500).json({ error: fetchError.message });
  res.status(201).json(sale);
});

// GET /api/admin/sales — recent salon sale history, newest first.
router.get('/admin/sales', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { barber_id, from, to } = req.query;

  let query = req.supabase
    .from('sales')
    .select('*, barbers(name, nickname), sale_items(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (barber_id) {
    query = query.eq('barber_id', barber_id);
  }
  if (from) {
    query = query.gte('created_at', new Date(from).toISOString());
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte('created_at', toDate.toISOString());
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/admin/sales/:id — fetch single sale with items and barber
router.get('/admin/sales/:id', requireAdmin, async (req, res) => {
  const { data, error } = await req.supabase
    .from('sales')
    .select('*, barbers(name, nickname, phone), sale_items(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/admin/sales/:id — update sale
router.put('/admin/sales/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { created_at, items, details = {} } = req.body || {};

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

    if (!product_name) throw new Error('Each item must have a name');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be positive');
    if (!Number.isFinite(unit_price) || unit_price < 0) throw new Error('Price must be valid');

    return {
      product_id: item.product_id ?? null,
      product_name,
      item_type: item.item_type || 'service',
      barber_id: item.barber_id ?? null,
      barber_name: item.barber_name ?? null,
      quantity,
      unit_price,
      line_total: Number((unit_price * quantity).toFixed(2)),
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + Number(item.line_total), 0);
  const tip = Number(details.tip || 0);
  const total = subtotal + tip;

  try {
    const { error: saleError } = await req.supabase
      .from('sales')
      .update({
        created_at: new Date(created_at).toISOString(),
        customer_name: details.customer_name || 'អតិថិជនទូទៅ (Walk-in)',
        customer_phone: details.customer_phone || null,
        barber_id: details.barber_id ? Number(details.barber_id) : null,
        payment_method: details.payment_method || 'cash_usd',
        subtotal,
        tip,
        total,
        notes: details.notes || null,
      })
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
      item_type: item.item_type,
      barber_id: item.barber_id,
      barber_name: item.barber_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
    }));

    const { error: insertError } = await req.supabase.from('sale_items').insert(rows);
    if (insertError) return res.status(400).json({ error: insertError.message });

    const { data: sale, error: fetchError } = await req.supabase
      .from('sales')
      .select('*, barbers(name, nickname, phone), sale_items(*)')
      .eq('id', id)
      .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });
    res.json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/sales/:id — delete sale record
router.delete('/admin/sales/:id', requireAdmin, async (req, res) => {
  const { error } = await req.supabase
    .from('sales')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

export default router;
