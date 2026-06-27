import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Produtos from './pages/Produtos'
import Vendas from './pages/Vendas'
import Despesas from './pages/Despesas'
import Relatorio from './pages/Relatorio'
import Utilizadores from './pages/Utilizadores'
import Movimentos from './pages/Movimentos'
import Configuracoes from './pages/Configuracoes'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="vendas" element={<ProtectedRoute><Vendas /></ProtectedRoute>} />
          <Route path="produtos" element={<ProtectedRoute adminOnly><Produtos /></ProtectedRoute>} />
          <Route path="movimentos" element={<ProtectedRoute adminOnly><Movimentos /></ProtectedRoute>} />
          <Route path="despesas" element={<ProtectedRoute adminOnly><Despesas /></ProtectedRoute>} />
          <Route path="relatorio" element={<ProtectedRoute adminOnly><Relatorio /></ProtectedRoute>} />
          <Route path="utilizadores" element={<ProtectedRoute adminOnly><Utilizadores /></ProtectedRoute>} />
          <Route path="configuracoes" element={<ProtectedRoute adminOnly><Configuracoes /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
