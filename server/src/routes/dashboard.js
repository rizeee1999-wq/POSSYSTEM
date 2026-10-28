import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const LOW_STOCK_THRESHOLD = 5;

// GET /api/admin/dashboard — barbershop and salon performance metrics
router.get('/admin/dashboard', requireAdmin, async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    todaySalesRes,
    recentSalesRes,
    recentItemsRes,
    lowStockRes,
    barbersRes,
    productCountRes,
  ] = await Promise.all([
    req.supabase
      .from('sales')
      .select('id, total, subtotal, tip, payment_method, barber_id, created_at, barbers(name, nickname)')
      .gte('created_at', startOfToday.toISOString()),
    req.supabase
      .from('sales')
      .select('id, total, barber_id, created_at, barbers(name, nickname)')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    req.supabase
      .from('sale_items')
      .select('product_id, product_name, item_type, quantity, line_total, barber_id, barber_name, sales!inner(created_at)')
      .gte('sales.created_at', thirtyDaysAgo.toISOString()),
    req.supabase
      .from('products')
      .select('id, name, stock')
      .eq('item_type', 'product')
      .lte('stock', LOW_STOCK_THRESHOLD)
      .order('stock', { ascending: true }),
    req.supabase
      .from('barbers')
      .select('id, name, nickname, role, active')
      .eq('active', true),
    req.supabase.from('products').select('id', { count: 'exact', head: true }),
  ]);

  if (todaySalesRes.error) return res.status(500).json({ error: todaySalesRes.error.message });
  if (recentItemsRes.error) return res.status(500).json({ error: recentItemsRes.error.message });
  if (lowStockRes.error) return res.status(500).json({ error: lowStockRes.error.message });

  const todaySalesTotal = todaySalesRes.data.reduce((sum, s) => sum + Number(s.total), 0);
  const todayTipsTotal = todaySalesRes.data.reduce((sum, s) => sum + Number(s.tip || 0), 0);
  const todaySalesCount = todaySalesRes.data.length;

  // Breakdown by payment method today
  const paymentBreakdown = {
    cash_usd: 0,
    cash_khr: 0,
    aba_khqr: 0,
    card: 0,
  };
  for (const s of todaySalesRes.data) {
    const pm = s.payment_method || 'cash_usd';
    if (paymentBreakdown[pm] !== undefined) {
      paymentBreakdown[pm] += Number(s.total);
    }
  }

  // Top services & products (30 days)
  const byService = new Map();
  const byProduct = new Map();
  const byBarber = new Map();

  for (const item of recentItemsRes.data) {
    const isService = item.item_type === 'service';
    const targetMap = isService ? byService : byProduct;
    const key = item.product_id ?? item.product_name;

    const entry = targetMap.get(key) || { name: item.product_name, count: 0, revenue: 0 };
    entry.count += item.quantity;
    entry.revenue += Number(item.line_total);
    targetMap.set(key, entry);

    // Track barber performance from items or sales
    if (item.barber_name || item.barber_id) {
      const bKey = item.barber_name || `Barber #${item.barber_id}`;
      const bEntry = byBarber.get(bKey) || { name: bKey, servicesCount: 0, revenue: 0 };
      bEntry.servicesCount += item.quantity;
      bEntry.revenue += Number(item.line_total);
      byBarber.set(bKey, bEntry);
    }
  }

  const topServices = [...byService.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topBarbers = [...byBarber.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  res.json({
    today_sales_total: todaySalesTotal,
    today_tips_total: todayTipsTotal,
    today_sales_count: todaySalesCount,
    payment_breakdown: paymentBreakdown,
    top_services_30d: topServices,
    top_products_30d: topProducts,
    top_barbers_30d: topBarbers,
    low_stock_products: lowStockRes.data,
    active_barbers_count: barbersRes.data?.length ?? 0,
    total_menu_items: productCountRes.count ?? 0,
  });
});

export default router;
