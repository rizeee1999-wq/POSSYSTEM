import { Router } from 'express';
import { publicClient } from '../supabaseClient.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const KHMER_CAT_OVERRIDES = {
  'កក់សក់ & ម៉ាស្សាក្បាល (Wash & Massage)': 'កក់សក់ & ម៉ាស្សាក្បាល',
  'កាត់សក់ & ផ្លុំសិត (Haircut & Styling)': 'កាត់សក់ & ផ្លុំសិត',
  'កោរពុកមាត់ & កន្សែងក្តៅ (Shave & Beard)': 'កោរពុកមាត់ & កន្សែងក្តៅ',
  'ប្តូរពណ៌សក់ & អ៊ុតរួញ (Color & Perm)': 'ប្តូរពណ៌សក់ & អ៊ុតរួញ',
  'ផលិតផលសិតសក់ & ថែទាំ (Haircare & Products)': 'ផលិតផលសិតសក់ & ថែទាំ',
};

function cleanKhmerName(name) {
  if (!name) return '';
  if (KHMER_CAT_OVERRIDES[name]) return KHMER_CAT_OVERRIDES[name];
  return name.replace(/\s*\([A-Za-z0-9\s/&,.-]+\)/g, '').trim();
}

// GET /api/categories — public, used by the client catalog for filters.
router.get('/categories', async (req, res) => {
  const { data, error } = await publicClient
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const sanitized = (data || []).map((c) => ({
    ...c,
    name: cleanKhmerName(c.name),
  }));
  res.json(sanitized);
});

// POST /api/admin/categories — admin only.
router.post('/admin/categories', requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const { data, error } = await req.supabase
    .from('categories')
    .insert({ name: cleanKhmerName(name.trim()) })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({
    ...data,
    name: cleanKhmerName(data.name),
  });
});

// PUT /api/admin/categories/:id — admin only (update/rename category)
router.put('/admin/categories/:id', requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const { data, error } = await req.supabase
    .from('categories')
    .update({ name: cleanKhmerName(name.trim()) })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({
    ...data,
    name: cleanKhmerName(data.name),
  });
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
