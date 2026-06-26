import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Layout() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isAdmin = role === 'admin'
  const initials = user?.email?.[0]?.toUpperCase() || 'U'

  const navItems = [
    { path: '/', icon: '◈', label: 'Dashboard', always: true },
    { path: '/vendas', icon: '🛒', label: 'Vendas', always: true },
    { path: '/produtos', icon: '📦', label: 'Produtos', admin: true },
    { path: '/movimentos', icon: '↕️', label: 'Movimentos', admin: true },
    { path: '/despesas', icon: '💸', label: 'Despesas', admin: true },
    { path: '/relatorio', icon: '📈', label: 'Relatório', admin: true },
    { path: '/utilizadores', icon: '👥', label: 'Equipa', admin: true },
    { path: '/configuracoes', icon: '⚙️', label: 'Config.', admin: true },
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-logo">
          <div className="k-badge">K</div>
          <div className="name">KITO<span>LAS</span></div>
        </div>
        <div className="topbar-right">
          <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-worker'}`}>
            {isAdmin ? '⚡ Admin' : '👤 Trabalhador'}
          </span>
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn btn-ghost btn-sm no-print" onClick={() => { signOut(auth); navigate('/login') }}>Sair</button>
        </div>
      </header>

      <nav className="sidenav">
        {navItems.filter(i => i.always || (i.admin && isAdmin)).map(i => (
          <button key={i.path}
            className={`nav-item ${pathname === i.path ? 'active' : ''}`}
            onClick={() => navigate(i.path)}>
            <span className="nav-icon">{i.icon}</span>
            {i.label}
          </button>
        ))}
      </nav>

      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
