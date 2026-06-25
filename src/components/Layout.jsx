import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Layout() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isAdmin = role === 'admin'

  const navItems = [
    { path: '/', label: '📊 Resumo', always: true },
    { path: '/vendas', label: '🛒 Vendas', always: true },
    { path: '/produtos', label: '📦 Produtos', adminOnly: true },
    { path: '/despesas', label: '💸 Despesas', adminOnly: true },
    { path: '/relatorio', label: '📈 Relatório', adminOnly: true },
    { path: '/utilizadores', label: '👥 Utilizadores', adminOnly: true },
  ]

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="top-bar">
        <div className="top-logo">KITO<span>LAS</span></div>
        <div className="top-user">
          <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-worker'}`}>
            {isAdmin ? 'Admin' : 'Trabalhador'}
          </span>
          <span style={{ color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </span>
          <button className="btn btn-ghost btn-sm no-print" onClick={handleLogout}>Sair</button>
        </div>
      </header>
      <nav className="side-nav">
        {navItems
          .filter(item => item.always || (item.adminOnly && isAdmin))
          .map(item => (
            <button
              key={item.path}
              className={`nav-btn ${pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))
        }
      </nav>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
