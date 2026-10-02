import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const LOW_STOCK_THRESHOLD = 5;

// GET /api/admin/dashboard — the numbers the admin dashboard shows on load.
router.get('/admin/dashboard', requireAdmin, async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [todaySalesRes, recentItemsRes, lowStockRes, productCountRes] = await Promise.all([
    req.supabase
      .from('sales')
      .select('id, total, created_at')
      .gte('created_at', startOfToday.toISOString()),
    req.supabase
      .from('sale_items')
      .select('product_id, product_name, quantity, line_total, sales!inner(created_at)')
      .gte('sales.created_at', thirtyDaysAgo.toISOString()),
    req.supabase
      .from('products')
      .select('id, name, stock')
      .lte('stock', LOW_STOCK_THRESHOLD)
      .order('stock', { ascending: true }),
    req.supabase.from('products').select('id', { count: 'exact', head: true }),
  ]);

  if (todaySalesRes.error) return res.status(500).json({ error: todaySalesRes.error.message });
  if (recentItemsRes.error) return res.status(500).json({ error: recentItemsRes.error.message });
  if (lowStockRes.error) return res.status(500).json({ error: lowStockRes.error.message });

  const todaySalesTotal = todaySalesRes.data.reduce((sum, s) => sum + Number(s.total), 0);
  const todaySalesCount = todaySalesRes.data.length;

  // Aggregate top-selling products (by units sold) over the last 30 days.
  const byProduct = new Map();
  for (const item of recentItemsRes.data) {
    const key = item.product_id ?? item.product_name;
    const entry = byProduct.get(key) || { name: item.product_name, quantity: 0, revenue: 0 };
    entry.quantity += item.quantity;
    entry.revenue += Number(item.line_total);
    byProduct.set(key, entry);
  }
  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  res.json({
    today_sales_total: todaySalesTotal,
    today_sales_count: todaySalesCount,
    low_stock_products: lowStockRes.data,
    top_products_30d: topProducts,
    total_products: productCountRes.count ?? null,
  });
});

export default router;
