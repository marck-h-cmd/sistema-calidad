'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const [correo, setCorreo] = useState('admin@unitru.edu.pe');
  const [contrasena, setContrasena] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(correo, contrasena);
      router.push('/dashboard');
    } catch {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-soft" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-soft" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Header with Theme Toggle */}
        <div className="flex justify-end mb-6">
          <div className="p-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-lg">
            <ThemeToggle />
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-10 animate-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-2xl shadow-blue-500/20 dark:shadow-blue-900/40 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 id="login-title" className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">SGC — UNT</h1>
          <p className="text-slate-500 dark:text-slate-400 text-base mt-3">Sistema de Gestión de la Calidad</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Universidad Nacional de Trujillo</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 shadow-2xl animate-in animate-in-delay-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-700/60">
          <main role="main" aria-labelledby="login-title">
            <form onSubmit={handleSubmit} className="space-y-5" role="form" aria-describedby={error ? 'login-error' : undefined}>
              <div>
                <label htmlFor="correo" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Correo institucional
                </label>
                <input
                  id="correo"
                  name="correo"
                  autoComplete="username"
                  type="email"
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 
                             border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50
                             focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-900
                             transition-all duration-300"
                  placeholder="usuario@unitru.edu.pe"
                  required
                />
              </div>
              <div>
                <label htmlFor="contrasena" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Contraseña
                </label>
                <input
                  id="contrasena"
                  name="contrasena"
                  autoComplete="current-password"
                  type="password"
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 
                             border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50
                             focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-900
                             transition-all duration-300"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div id="login-error" role="alert" aria-live="assertive" className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl px-5 py-4 animate-in animate-in-delay-2">
                  <svg className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300
                           disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] mt-2 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
                style={{ background: loading ? '#1d4ed8' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : 'Iniciar Sesión'}
              </button>
            </form>
          </main>

          <div className="mt-7 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">Demo: admin@unitru.edu.pe · password</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
          © 2024 Universidad Nacional de Trujillo
        </p>
      </div>
    </div>
  );
}
