import { Route, Routes } from 'react-router-dom';

import Catalog from './pages/client/Catalog.jsx';
import ProductDetail from './pages/client/ProductDetail.jsx';

import Login from './pages/admin/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Products from './pages/admin/Products.jsx';
import Sell from './pages/admin/Sell.jsx';
import Queue from './pages/admin/Queue.jsx';
import Barbers from './pages/admin/Barbers.jsx';
import SalesHistory from './pages/admin/SalesHistory.jsx';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminNav from './components/AdminNav.jsx';

function AdminLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="admin-shell">
        <AdminNav />
        <main className="admin-main">{children}</main>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ---- Public client site / Salon showcase ---- */}
      <Route path="/" element={<Catalog />} />
      <Route path="/product/:id" element={<ProductDetail />} />

      {/* ---- Admin Portal ---- */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <AdminLayout>
            <Dashboard />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/sell"
        element={
          <AdminLayout>
            <Sell />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/queue"
        element={
          <AdminLayout>
            <Queue />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/products"
        element={
          <AdminLayout>
            <Products />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/barbers"
        element={
          <AdminLayout>
            <Barbers />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/sales"
        element={
          <AdminLayout>
            <SalesHistory />
          </AdminLayout>
        }
      />

      <Route path="*" element={<div className="page-loading">Page not found.</div>} />
    </Routes>
  );
}
