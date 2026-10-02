import { Router } from 'express';
import { publicClient } from '../supabaseClient.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/categories — public, used by the client catalog for filters.
router.get('/categories', async (req, res) => {
  const { data, error } = await publicClient
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/admin/categories — admin only.
router.post('/admin/categories', requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const { data, error } = await req.supabase
    .from('categories')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/admin/categories/:id — admin only.
router.delete('/admin/categories/:id', requireAdmin, async (req, res) => {
  const { error } = await req.supabase
    .from('categories')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

export default router;
