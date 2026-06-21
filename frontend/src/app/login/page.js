'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Eye, EyeOff, Mail, Lock, Sparkles, Shield, FileText, Award, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [correo, setCorreo] = useState('admin@unitru.edu.pe');
  const [contrasena, setContrasena] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && resolvedTheme === 'dark';

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
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 ${isDark ? 'bg-[#0b0f19] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Theme Toggle in top right */}
      <div className="absolute top-4 right-4 z-50">
        <div className="p-1 rounded-2xl bg-white/10 dark:bg-slate-800/40 backdrop-blur-xl border border-slate-200/20 dark:border-slate-700/30 shadow-lg">
          <ThemeToggle />
        </div>
      </div>

      {/* Left side: Information Banner */}
      <div className={`relative flex-1 hidden md:flex flex-col justify-between p-12 lg:p-16 overflow-hidden border-r border-slate-200/10 ${isDark ? 'bg-gradient-to-br from-[#0c1628] via-[#080d1a] to-[#04060d]' : 'bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-50'}`}>
        
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#fff' : '#000'} 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Logo / Header */}
        <div className="flex items-center gap-4 relative z-10 animate-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg border border-white/10 shrink-0">
            <span className="text-white font-extrabold text-sm tracking-wider">UNT</span>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-amber-500 dark:text-amber-400 uppercase tracking-widest leading-none">Universidad Nacional de Trujillo</p>
            <h2 className={`text-base font-extrabold tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Gestión de la Calidad</h2>
          </div>
        </div>

        {/* Main Banner Message */}
        <div className="my-auto py-12 relative z-10 space-y-6 max-w-lg animate-in animate-in-delay-1">
          <h1 className={`text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Gestión inteligente <br />
            <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 bg-clip-text text-transparent">de la calidad 2026</span>
          </h1>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Control de procesos, auditorías, riesgos, indicadores y acreditación en una plataforma unificada para la Universidad Nacional de Trujillo.
          </p>

          {/* Points list */}
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-205">Control documental y mapa de procesos</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Gestión de versiones y flujos de procesos universitarios.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-205">Auditorías internas y gestión CAPA</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Registro de hallazgos y seguimiento de acciones correctivas.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-205">Indicadores de desempeño y encuestas</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Autoevaluación continua de estándares de acreditación.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 dark:text-slate-500 animate-in animate-in-delay-3">
          © 2026 UNT — Sistema de Gestión de la Calidad
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className={`flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16 relative overflow-hidden ${isDark ? 'bg-[#030712]' : 'bg-slate-50'}`}>
        
        {/* Glow blobs on right side background (only in dark mode) */}
        {isDark && (
          <>
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-soft" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-soft" style={{ animationDelay: '1s' }} />
          </>
        )}

        <div className="w-full max-w-xl relative z-10">
          
          {/* Card */}
          <div 
            className="rounded-3xl p-8 lg:p-10 shadow-2xl animate-in animate-in-delay-1"
            style={{
              background: isDark ? 'rgba(17, 24, 39, 0.6)' : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(226, 232, 240, 0.8)',
            }}
          >
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Bienvenido</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">Ingrese sus credenciales institucionales</p>

            {/* Quick Access Area */}
            <div className="mt-6 pt-5 border-t border-slate-200/55 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 mb-3 text-amber-500 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest">Acceso Rápido (Demostración)</span>
              </div>

              {/* Roles buttons grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Administrador', desc: 'Control total de calidad', email: 'admin@unitru.edu.pe', color: 'border-blue-200/30 dark:border-blue-800/40 hover:bg-blue-500/5' },
                  { label: 'Gestor Calidad', desc: 'Gestión de procesos', email: 'maria.garcia@unitru.edu.pe', color: 'border-emerald-200/30 dark:border-emerald-800/40 hover:bg-emerald-500/5' },
                  { label: 'Auditor', desc: 'Auditorías y CAPAs', email: 'juan.rodriguez@unitru.edu.pe', color: 'border-violet-200/30 dark:border-violet-800/40 hover:bg-violet-500/5' },
                  { label: 'Docente', desc: 'Mediciones y encuestas', email: 'carlos.morales@unitru.edu.pe', color: 'border-amber-200/30 dark:border-amber-800/40 hover:bg-amber-500/5' },
                  { label: 'Estudiante', desc: 'Participa en encuestas', email: 'jorge.vargas@unitru.edu.pe', color: 'border-sky-200/30 dark:border-sky-800/40 hover:bg-sky-500/5' },
                  { label: 'Egresado', desc: 'Seguimiento de egreso', email: 'fernando.herrera@unitru.edu.pe', color: 'border-slate-200/30 dark:border-slate-800/40 hover:bg-slate-500/5' }
                ].map((r) => (
                  <button
                    key={r.email}
                    type="button"
                    onClick={() => {
                      setCorreo(r.email);
                      setContrasena('password');
                    }}
                    className="p-3 text-left rounded-xl border transition-all duration-200 active:scale-[0.98] flex flex-col bg-white/5 dark:bg-slate-900/30 border-slate-200/30 dark:border-slate-800/40 hover:bg-amber-500/5"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{r.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{r.desc}</span>
                  </button>
                ))}
              </div>

              {/* Password badge */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Contraseña de prueba:</span>
                <code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-350 font-mono font-bold">password</code>
              </div>
            </div>

            {/* Inputs Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              
              {/* Correo */}
              <div>
                <label htmlFor="correo" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-550" />
                  <input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="usuario@unitru.edu.pe"
                    required
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="contrasena" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-550" />
                  <input
                    id="contrasena"
                    type={showPassword ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl px-4 py-3.5 animate-in">
                  <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-450 shrink-0" />
                  <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="shimmer-btn w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] mt-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:shadow-xl bg-blue-600 hover:bg-blue-500"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : 'Ingresar al sistema'}
              </button>
            </form>
          </div>

          {/* Copyright below on mobile */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8 md:hidden">
            © 2026 Universidad Nacional de Trujillo
          </p>
        </div>
      </div>
    </div>
  );
}
