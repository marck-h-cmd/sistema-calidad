'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  FileText,
  Zap,
  ShieldCheck,
  Search,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';

const nav = [
  {
    group: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    ],
  },
  {
    group: 'Gestión',
    items: [
      { href: '/documentos', label: 'Documentos', icon: <FileText className="w-5 h-5" /> },
      { href: '/procesos', label: 'Mapa de Procesos', icon: <Zap className="w-5 h-5" /> },
      { href: '/acreditacion', label: 'Acreditación', icon: <ShieldCheck className="w-5 h-5" /> },
    ],
  },
  {
    group: 'Control',
    items: [
      { href: '/auditorias', label: 'Auditorías', icon: <Search className="w-5 h-5" /> },
      { href: '/capas', label: 'CAPA', icon: <AlertTriangle className="w-5 h-5" /> },
      { href: '/riesgos', label: 'Riesgos', icon: <AlertTriangle className="w-5 h-5" /> },
    ],
  },
  {
    group: 'Métricas',
    items: [
      { href: '/indicadores', label: 'Indicadores', icon: <TrendingUp className="w-5 h-5" /> },
      { href: '/encuestas', label: 'Encuestas', icon: <ClipboardList className="w-5 h-5" /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { usuario, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isActive = (href) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const sidebarContent = (
    <aside className="w-[250px] min-h-screen bg-white dark:bg-slate-900 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-900/30 shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-slate-900 dark:text-white font-extrabold text-sm leading-tight">SGC — UNT</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">Sistema de Calidad</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-4 overflow-y-auto space-y-6">
        {nav.map((group) => (
          <div key={group.group}>
            <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2">
              {group.group}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={`sidebar-link ${active ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-2 bg-slate-50 dark:bg-slate-800/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {usuario?.nombres?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{usuario?.nombres}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">{usuario?.rol?.replace('_', ' ')}</p>
          </div>
          <ThemeToggle />
        </div>
        <button onClick={logout}
          className="sidebar-link w-full text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 mt-1">
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/30 shrink-0">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-900 dark:text-white font-extrabold text-sm">SGC — UNT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  return sidebarContent;
}
