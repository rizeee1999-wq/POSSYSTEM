import { Router } from 'express';
import { publicClient } from '../supabaseClient.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/barbers — list all active barbers (publicly accessible for booking/showcase)
router.get('/barbers', async (req, res) => {
  const { data, error } = await publicClient
    .from('barbers')
    .select('*')
    .eq('active', true)
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/admin/barbers — list all barbers (including inactive)
router.get('/admin/barbers', requireAdmin, async (req, res) => {
  const { data, error } = await req.supabase
    .from('barbers')
    .select('*')
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/admin/barbers — create new barber/stylist
router.post('/admin/barbers', requireAdmin, async (req, res) => {
  const { name, nickname, role, phone, avatar_url, active } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Barber name is required' });
  }

  const { data, error } = await req.supabase
    .from('barbers')
    .insert({
      name: name.trim(),
      nickname: nickname?.trim() || null,
      role: role || 'barber',
      phone: phone?.trim() || null,
      avatar_url: avatar_url?.trim() || null,
      active: active !== undefined ? Boolean(active) : true,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/admin/barbers/:id — update barber/stylist
router.put('/admin/barbers/:id', requireAdmin, async (req, res) => {
  const { name, nickname, role, phone, avatar_url, active } = req.body || {};
  const updates = {};

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Barber name cannot be empty' });
    updates.name = name.trim();
  }
  if (nickname !== undefined) updates.nickname = nickname?.trim() || null;
  if (role !== undefined) updates.role = role;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url?.trim() || null;
  if (active !== undefined) updates.active = Boolean(active);

  const { data, error } = await req.supabase
    .from('barbers')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/admin/barbers/:id — delete barber
router.delete('/admin/barbers/:id', requireAdmin, async (req, res) => {
  const { error } = await req.supabase
    .from('barbers')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

export default router;
