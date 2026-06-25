import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { useToast } from '../hooks/useToast'
import * as XLSX from 'xlsx'

const fmt = n => Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)

const CATS = ['Transporte','Reposição de Stock','Água e Luz','Aluguer','Salários','Impostos','Manutenção','Outros']

export default function Despesas() {
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ desc: '', cat: 'Transporte', valor: '', data: today() })
  const [saving, setSaving] = useState(false)
  const [filtroDE, setFiltroDE] = useState('')
  const [filtroATE, setFiltroATE] = useState('')
  const { toast, showToast } = useToast()

  const load = async () => {
    const snap = await getDocs(query(collection(db, 'despesas'), orderBy('data', 'desc')))
    setDespesas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtradas = despesas.filter(d => {
    if (filtroDE && d.data < filtroDE) return false
    if (filtroATE && d.data > filtroATE) return false
    return true
  })
  const totalFiltrado = filtradas.reduce((s, d) => s + d.valor, 0)

  const save = async () => {
    if (!form.desc.trim() || !form.valor || !form.data) { showToast('⚠️ Preencha todos os campos'); return }
    setSaving(true)
    await addDoc(collection(db, 'despesas'), {
      desc: form.desc.trim(), cat: form.cat,
      valor: Number(form.valor), data: form.data,
    })
    showToast('✅ Despesa registada')
    setSaving(false); setModal(false); load()
  }

  const del = async (id) => {
    if (!confirm('Eliminar despesa?')) return
    await deleteDoc(doc(db, 'despesas', id))
    showToast('🗑️ Despesa eliminada'); load()
  }

  const exportExcel = () => {
    const rows = [['Descrição','Categoria','Valor (MT)','Data']]
    filtradas.forEach(d => rows.push([d.desc, d.cat, d.valor, d.data]))
    rows.push(['TOTAL', '', totalFiltrado, ''])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Despesas')
    XLSX.writeFile(wb, 'kitolas_despesas.xlsx')
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="page-title">💸 Despesas</div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{filtradas.length} despesa(s)</span>
          <div className="table-actions">
            <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Excel</button>
            <button className="btn btn-red" onClick={() => { setForm({ desc:'', cat:'Transporte', valor:'', data:today() }); setModal(true) }}>+ Nova Despesa</button>
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
          <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Data</th><th></th></tr></thead>
          <tbody>
            {filtradas.length === 0
              ? <tr><td colSpan={5} className="empty">Sem despesas no período</td></tr>
              : filtradas.map(d => (
                <tr key={d.id}>
                  <td><strong>{d.desc}</strong></td>
                  <td style={{ color: 'var(--muted)' }}>{d.cat}</td>
                  <td style={{ color: 'var(--red)' }}><strong>{fmt(d.valor)} MT</strong></td>
                  <td style={{ color: 'var(--muted)' }}>{d.data}</td>
                  <td><button className="btn btn-red btn-sm" onClick={() => del(d.id)}>🗑️</button></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h3>Nova Despesa</h3>
            <div className="field"><label>Descrição</label>
              <input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="Ex: Transporte de mercadoria" />
            </div>
            <div className="field"><label>Categoria</label>
              <select value={form.cat} onChange={e => setForm(p => ({ ...p, cat: e.target.value }))}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Valor (MT)</label>
              <input type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
            </div>
            <div className="field"><label>Data</label>
              <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-red" onClick={save} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
