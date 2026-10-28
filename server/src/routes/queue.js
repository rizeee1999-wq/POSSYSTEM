import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/admin/queue — get all queue tickets (waiting and in_chair by default, or all today)
router.get('/admin/queue', requireAdmin, async (req, res) => {
  const { status, allToday } = req.query;

  let query = req.supabase
    .from('queue_tickets')
    .select('*, barbers(name, nickname), products(name, price, duration_min)')
    .order('created_at', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  } else if (!allToday) {
    query = query.in('status', ['waiting', 'in_chair']);
  }

  if (allToday) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    query = query.gte('created_at', startOfToday.toISOString());
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/admin/queue — add customer to queue
router.post('/admin/queue', requireAdmin, async (req, res) => {
  const { customer_name, customer_phone, barber_id, service_id, status, notes } = req.body || {};

  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  const { data, error } = await req.supabase
    .from('queue_tickets')
    .insert({
      customer_name: customer_name.trim(),
      customer_phone: customer_phone?.trim() || null,
      barber_id: barber_id ? Number(barber_id) : null,
      service_id: service_id ? Number(service_id) : null,
      status: status || 'waiting',
      notes: notes?.trim() || null,
    })
    .select('*, barbers(name, nickname), products(name, price, duration_min)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/admin/queue/:id — update ticket status or barber
router.patch('/admin/queue/:id', requireAdmin, async (req, res) => {
  const { status, barber_id, service_id, notes } = req.body || {};
  const updates = {};

  if (status !== undefined) updates.status = status;
  if (barber_id !== undefined) updates.barber_id = barber_id ? Number(barber_id) : null;
  if (service_id !== undefined) updates.service_id = service_id ? Number(service_id) : null;
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  const { data, error } = await req.supabase
    .from('queue_tickets')
    .update(updates)
    .eq('id', req.params.id)
    .select('*, barbers(name, nickname), products(name, price, duration_min)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/admin/queue/:id — delete/remove ticket
router.delete('/admin/queue/:id', requireAdmin, async (req, res) => {
  const { error } = await req.supabase
    .from('queue_tickets')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

export default router;
