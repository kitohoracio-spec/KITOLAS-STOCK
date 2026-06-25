import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useToast } from '../hooks/useToast'
import * as XLSX from 'xlsx'

const fmt = n => Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const CATS = ['Cereais e Grãos','Óleos e Gorduras','Bebidas','Condimentos','Higiene','Laticínios','Carne e Peixe','Frutas e Vegetais','Outros']
const UNIS = ['un','kg','L','fardo','cx','dz']

const blank = { nome:'', categoria:'Cereais e Grãos', stockAnterior:0, stockActual:0, stockMinimo:5, precoCompra:0, precoVenda:0, unidade:'un' }

function StockBadge({ p }) {
  if (p.stockActual <= 0) return <span className="badge badge-out">Esgotado</span>
  if (p.stockActual <= p.stockMinimo) return <span className="badge badge-low">Stock Baixo</span>
  return <span className="badge badge-ok">OK</span>
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(blank)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const { toast, showToast } = useToast()

  const load = async () => {
    const snap = await getDocs(collection(db, 'produtos'))
    setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(blank); setEditId(null); setModal(true) }
  const openEdit = (p) => { setForm({ ...p }); setEditId(p.id); setModal(true) }

  const save = async () => {
    if (!form.nome.trim()) { showToast('⚠️ Insira o nome do produto'); return }
    setSaving(true)
    const data = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      stockAnterior: Number(form.stockAnterior) || 0,
      stockActual: Number(form.stockActual) || 0,
      stockMinimo: Number(form.stockMinimo) || 5,
      precoCompra: Number(form.precoCompra) || 0,
      precoVenda: Number(form.precoVenda) || 0,
      unidade: form.unidade,
    }
    if (editId) {
      await updateDoc(doc(db, 'produtos', editId), data)
      showToast('✅ Produto actualizado')
    } else {
      await addDoc(collection(db, 'produtos'), data)
      showToast('✅ Produto adicionado')
    }
    setSaving(false); setModal(false); load()
  }

  const del = async (id) => {
    if (!confirm('Eliminar produto?')) return
    await deleteDoc(doc(db, 'produtos', id))
    showToast('🗑️ Produto eliminado'); load()
  }

  const exportExcel = () => {
    const rows = [['Nome','Categoria','Stock Ant.','Stock Act.','Unidade','P.Compra (MT)','P.Venda (MT)','Mínimo','Estado']]
    produtos.forEach(p => {
      const est = p.stockActual <= 0 ? 'Esgotado' : p.stockActual <= p.stockMinimo ? 'Baixo' : 'OK'
      rows.push([p.nome, p.categoria, p.stockAnterior, p.stockActual, p.unidade, p.precoCompra, p.precoVenda, p.stockMinimo, est])
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Produtos')
    XLSX.writeFile(wb, 'kitolas_produtos.xlsx')
  }

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="page-title">📦 Produtos</div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{produtos.length} produto(s)</span>
          <div className="table-actions">
            <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Excel</button>
            <button className="btn btn-primary" onClick={openNew}>+ Adicionar</button>
          </div>
        </div>
        <table>
          <thead><tr>
            <th>Nome</th><th>Categoria</th><th>Ant.</th><th>Act.</th>
            <th>P.Compra</th><th>P.Venda</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            {produtos.length === 0
              ? <tr><td colSpan={8} className="empty">Nenhum produto. Clique em "+ Adicionar"</td></tr>
              : produtos.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.nome}</strong></td>
                  <td style={{ color: 'var(--muted)' }}>{p.categoria}</td>
                  <td>{p.stockAnterior} {p.unidade}</td>
                  <td><strong>{p.stockActual} {p.unidade}</strong></td>
                  <td>{fmt(p.precoCompra)} MT</td>
                  <td style={{ color: 'var(--green)' }}>{fmt(p.precoVenda)} MT</td>
                  <td><StockBadge p={p} /></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                    <button className="btn btn-red btn-sm" style={{ marginLeft: 4 }} onClick={() => del(p.id)}>🗑️</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h3>{editId ? 'Editar Produto' : 'Novo Produto'}</h3>
            <div className="field"><label>Nome</label><input value={form.nome} onChange={e => f('nome', e.target.value)} placeholder="Ex: Arroz 5kg" /></div>
            <div className="field"><label>Categoria</label>
              <select value={form.categoria} onChange={e => f('categoria', e.target.value)}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Stock Anterior</label><input type="number" min="0" value={form.stockAnterior} onChange={e => f('stockAnterior', e.target.value)} /></div>
            <div className="field"><label>Stock Actual</label><input type="number" min="0" value={form.stockActual} onChange={e => f('stockActual', e.target.value)} /></div>
            <div className="field"><label>Stock Mínimo (alerta)</label><input type="number" min="0" value={form.stockMinimo} onChange={e => f('stockMinimo', e.target.value)} /></div>
            <div className="field"><label>Preço de Compra (MT)</label><input type="number" min="0" step="0.01" value={form.precoCompra} onChange={e => f('precoCompra', e.target.value)} /></div>
            <div className="field"><label>Preço de Venda (MT)</label><input type="number" min="0" step="0.01" value={form.precoVenda} onChange={e => f('precoVenda', e.target.value)} /></div>
            <div className="field"><label>Unidade</label>
              <select value={form.unidade} onChange={e => f('unidade', e.target.value)}>
                {UNIS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
