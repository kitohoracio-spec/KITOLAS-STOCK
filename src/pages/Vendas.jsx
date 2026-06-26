import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import * as XLSX from 'xlsx'

const fmt = n => Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)

export default function Vendas() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [vendas, setVendas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ prodId: '', qtd: '', preco: '', data: today() })
  const [saving, setSaving] = useState(false)
  const [filtroDE, setFiltroDE] = useState('')
  const [filtroATE, setFiltroATE] = useState('')
  const { toast, showToast } = useToast()

  const load = async () => {
    const [vs, ps] = await Promise.all([
      getDocs(query(collection(db, 'vendas'), orderBy('data', 'desc'))),
      getDocs(collection(db, 'produtos')),
    ])
    setVendas(vs.docs.map(d => ({ id: d.id, ...d.data() })))
    setProdutos(ps.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtradas = vendas.filter(v => {
    if (filtroDE && v.data < filtroDE) return false
    if (filtroATE && v.data > filtroATE) return false
    return true
  })
  const totalFiltrado = filtradas.reduce((s, v) => s + v.total, 0)

  const openModal = () => {
    const firstProd = produtos[0]
    setForm({ prodId: firstProd?.id || '', qtd: '', preco: firstProd?.precoVenda || '', data: today() })
    setModal(true)
  }

  const handleProdChange = (id) => {
    const p = produtos.find(x => x.id === id)
    setForm(prev => ({ ...prev, prodId: id, preco: p?.precoVenda || '' }))
  }

  const save = async () => {
    const { prodId, qtd, preco, data } = form
    if (!prodId || !qtd || !preco || !data) { showToast('⚠️ Preencha todos os campos'); return }
    const prod = produtos.find(p => p.id === prodId)
    if (!prod) return
    const q = Number(qtd)
    if (q > prod.stockActual) { showToast(`⚠️ Stock insuficiente! Disponível: ${prod.stockActual} ${prod.unidade}`); return }
    setSaving(true)
    await addDoc(collection(db, 'vendas'), {
      prodId, prodNome: prod.nome, qtd: q,
      preco: Number(preco), total: q * Number(preco), data,
    })
    await updateDoc(doc(db, 'produtos', prodId), { stockActual: prod.stockActual - q })
    showToast('✅ Venda registada')
    setSaving(false); setModal(false); load()
  }

  const del = async (id) => {
    if (!confirm('Eliminar venda? O stock será revertido.')) return
    const v = vendas.find(x => x.id === id)
    if (v) {
      const p = produtos.find(x => x.id === v.prodId)
      if (p) await updateDoc(doc(db, 'produtos', v.prodId), { stockActual: p.stockActual + v.qtd })
    }
    await deleteDoc(doc(db, 'vendas', id))
    showToast('🗑️ Venda eliminada'); load()
  }

  const exportExcel = () => {
    const rows = [['Produto','Quantidade','P.Unit (MT)','Total (MT)','Data']]
    filtradas.forEach(v => rows.push([v.prodNome, v.qtd, v.preco, v.total, v.data]))
    rows.push(['', '', 'TOTAL', totalFiltrado, ''])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Vendas')
    XLSX.writeFile(wb, 'kitolas_vendas.xlsx')
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="page-title">🛒 Vendas</div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{filtradas.length} venda(s)</span>
          <div className="table-actions">
            {isAdmin && <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Excel</button>}
            <button className="btn btn-green" onClick={openModal}>+ Nova Venda</button>
          </div>
        </div>
        <div className="filter-bar">
          <label>De:</label>
          <input type="date" value={filtroDE} onChange={e => setFiltroDE(e.target.value)} />
          <label>Até:</label>
          <input type="date" value={filtroATE} onChange={e => setFiltroATE(e.target.value)} />
          <button className="btn btn-ghost btn-sm" onClick={() => { setFiltroDE(''); setFiltroATE('') }}>✕</button>
          {(filtroDE || filtroATE) && (
            <span className="filter-info">{filtradas.length} registo(s) · {fmt(totalFiltrado)} MT</span>
          )}
        </div>
        <table>
          <thead><tr><th>Produto</th><th>Qtd</th><th>P.Unit.</th><th>Total</th><th>Data</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>
            {filtradas.length === 0
              ? <tr><td colSpan={6} className="empty">Sem vendas no período</td></tr>
              : filtradas.map(v => (
                <tr key={v.id}>
                  <td><strong>{v.prodNome}</strong></td>
                  <td>{v.qtd}</td>
                  <td>{fmt(v.preco)} MT</td>
                  <td style={{ color: 'var(--green)' }}><strong>{fmt(v.total)} MT</strong></td>
                  <td style={{ color: 'var(--muted)' }}>{v.data}</td>
                  {isAdmin && <td><button className="btn btn-red btn-sm" onClick={() => del(v.id)}>🗑️</button></td>}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h3>Registar Venda</h3>
            <div className="field"><label>Produto</label>
              <select value={form.prodId} onChange={e => handleProdChange(e.target.value)}>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (stock: {p.stockActual} {p.unidade})</option>)}
              </select>
            </div>
            <div className="field"><label>Quantidade</label>
              <input type="number" min="1" value={form.qtd} onChange={e => setForm(prev => ({ ...prev, qtd: e.target.value }))} />
            </div>
            <div className="field"><label>Preço Unitário (MT)</label>
              <input type="number" min="0" step="0.01" value={form.preco} onChange={e => setForm(prev => ({ ...prev, preco: e.target.value }))} />
            </div>
            <div className="field"><label>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))} />
            </div>
            {form.qtd && form.preco && (
              <div style={{ background: 'rgba(34,211,165,.1)', border: '1px solid var(--green)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13 }}>
                Total: <strong style={{ color: 'var(--green)' }}>{fmt(Number(form.qtd) * Number(form.preco))} MT</strong>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-green" onClick={save} disabled={saving}>{saving ? 'A registar...' : 'Registar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
