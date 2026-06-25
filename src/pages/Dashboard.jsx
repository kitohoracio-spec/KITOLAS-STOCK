import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'

const fmt = n => Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function StockBadge({ p }) {
  if (p.stockActual <= 0) return <span className="badge badge-out">Esgotado</span>
  if (p.stockActual <= p.stockMinimo) return <span className="badge badge-low">Stock Baixo</span>
  return <span className="badge badge-ok">OK</span>
}

export default function Dashboard() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [produtos, setProdutos] = useState([])
  const [vendas, setVendas] = useState([])
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [ps, vs, ds] = await Promise.all([
        getDocs(collection(db, 'produtos')),
        getDocs(query(collection(db, 'vendas'), orderBy('data', 'desc'), limit(20))),
        isAdmin ? getDocs(collection(db, 'despesas')) : Promise.resolve({ docs: [] }),
      ])
      setProdutos(ps.docs.map(d => ({ id: d.id, ...d.data() })))
      setVendas(vs.docs.map(d => ({ id: d.id, ...d.data() })))
      setDespesas(ds.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [isAdmin])

  if (loading) return <div className="spinner" />

  const totalReceita = vendas.reduce((s, v) => s + v.total, 0)
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0)
  const custoProd = vendas.reduce((s, v) => {
    const p = produtos.find(x => x.id === v.prodId)
    return s + (p ? p.precoCompra * v.qtd : 0)
  }, 0)
  const lucro = totalReceita - totalDespesas - custoProd
  const alertas = produtos.filter(p => p.stockActual <= p.stockMinimo)

  return (
    <>
      <div className="page-title">📊 Resumo</div>

      <div className="summary-grid">
        <div className="card">
          <div className="card-label">Produtos</div>
          <div className="card-value" style={{ color: 'var(--accent)' }}>{produtos.length}</div>
        </div>
        <div className="card">
          <div className="card-label">Receita</div>
          <div className="card-value" style={{ color: 'var(--green)' }}>{fmt(totalReceita)} MT</div>
        </div>
        {isAdmin && <>
          <div className="card">
            <div className="card-label">Despesas</div>
            <div className="card-value" style={{ color: 'var(--red)' }}>{fmt(totalDespesas)} MT</div>
          </div>
          <div className="card">
            <div className="card-label">Lucro Líquido</div>
            <div className="card-value" style={{ color: lucro >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(lucro)} MT</div>
          </div>
        </>}
      </div>

      {isAdmin && alertas.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <div className="table-header"><span className="table-title">⚠️ Stock em Alerta</span></div>
          <table>
            <thead><tr><th>Produto</th><th>Stock Actual</th><th>Mínimo</th><th>Estado</th></tr></thead>
            <tbody>
              {alertas.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.nome}</strong></td>
                  <td>{p.stockActual} {p.unidade}</td>
                  <td>{p.stockMinimo} {p.unidade}</td>
                  <td><StockBadge p={p} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">🛒 Vendas Recentes</span></div>
        <table>
          <thead><tr><th>Produto</th><th>Qtd</th><th>Total</th><th>Data</th></tr></thead>
          <tbody>
            {vendas.length === 0
              ? <tr><td colSpan={4} className="empty">Sem vendas registadas</td></tr>
              : vendas.slice(0, 8).map(v => (
                <tr key={v.id}>
                  <td>{v.prodNome}</td>
                  <td>{v.qtd}</td>
                  <td style={{ color: 'var(--green)' }}>{fmt(v.total)} MT</td>
                  <td style={{ color: 'var(--muted)' }}>{v.data}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </>
  )
}
