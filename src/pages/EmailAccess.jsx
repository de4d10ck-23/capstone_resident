import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function EmailAccess({ mode }) {
  const { API_URL, logout } = useAuth();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const forgot = mode === 'forgot-password';
  const reset = mode === 'reset-password';
  const title = forgot ? 'Forgot password?' : reset ? 'Choose a new password' : 'Verify your email';
  useEffect(() => {
    // Remove the link secret from the address bar after capturing it in memory.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (reset && password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgot ? { email } : reset ? { token, password } : { token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.detail) ? data.detail.map(item => item.msg).join('. ') : data.detail || 'Please try again.');
      setMessage(data.message);
      setDone(!forgot);
      if (reset) logout();
    } catch (err) { setError(err.message || 'Could not connect. Please try again.'); }
    finally { setBusy(false); }
  };
  const inputClass = 'w-full rounded-xl border border-slate-300 px-4 py-3 mt-2';
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-5">
        <p className="text-blue-700 font-semibold">WaterWatch · Resident Portal</p>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{forgot ? 'Enter the email address on your resident account. We will email you a reset link.' : reset ? 'Your link expires after 15 minutes. Resetting your password signs out your other sessions.' : 'Confirm below to verify this email address and finish creating your resident account.'}</p>
        {message && <p role="status" className="p-3 bg-green-50 text-green-800 rounded-xl">{message}</p>}
        {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl">{error}</p>}
        {!forgot && !token && <p role="alert" className="text-red-700">The email link is missing. Open the full link from your email or request a new one below.</p>}
        {!done && (forgot || token) && <form onSubmit={submit} className="space-y-4">
          {forgot && <label className="block text-sm font-medium">Email address<input className={inputClass} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
          {reset && <>
            <label className="block text-sm font-medium">New password<input className={inputClass} type="password" autoComplete="new-password" minLength={6} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)} /></label>
            <label className="block text-sm font-medium">Confirm password<input className={inputClass} type="password" autoComplete="new-password" minLength={6} maxLength={72} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
          </>}
          <button disabled={busy} className="w-full bg-blue-900 text-white rounded-xl py-3 font-semibold disabled:opacity-60">{busy ? 'Please wait…' : forgot ? 'Send reset link' : reset ? 'Reset password' : 'Verify email and create account'}</button>
        </form>}
        {!forgot && !done && <Link className="block text-blue-700 text-sm" to={reset ? '/forgot-password' : '/register'}>Request a new link</Link>}
        <Link className="block text-blue-700 text-sm" to="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
