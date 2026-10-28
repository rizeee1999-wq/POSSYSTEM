import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { t } from '../../lib/i18n.js';

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(t.loginError);
      return;
    }
    navigate('/admin');
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 0.75rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)',
            }}
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.5" y2="14.5" />
              <line x1="8.5" y1="9.5" x2="20" y2="20" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{t.loginTitle}</h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
            {t.appName} • ប្រព័ន្ធគ្រប់គ្រងហាង
          </p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-field">
          <label htmlFor="email">{t.email}</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">{t.password}</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? t.signingIn : t.signIn}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <a
            href="/"
            style={{
              fontSize: '0.85rem',
              color: 'var(--muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: '600',
            }}
          >
            ← {t.viewClientSite}
          </a>
        </div>
      </form>
    </div>
  );
}
