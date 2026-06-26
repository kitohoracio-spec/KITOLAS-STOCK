import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../hooks/useToast.jsx'

const fmt = n => Number(n).toLocaleString('pt-MZ',{minimumFractionDigits:2,maximumFractionDigits:2})
const today = () => new Date().toISOString().slice(0,10)

export default function Movimentos() {
  const [movimentos, setMovimentos] = useState([])
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({prodId:'',tipo:'entrada',qtd:'',motivo:'',data:today()})
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')
  const { toast, showToast } = useToast()

  const load = async () => {
    const [ms, ps] = await Promise.all([
      getDocs(query(collection(db,'movimentos'), orderBy('data','desc'))),
      getDocs(collection(db,'produtos'))
    ])
    setMovimentos(ms.docs.map(d=>({id:d.id,...d.data()})))
    setProdutos(ps.docs.map(d=>({id:d.id,...d.data()})))
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const save = async () => {
    const {prodId,tipo,qtd,motivo,data} = form
    if (!prodId||!qtd||!data) { showToast('⚠️ Preencha todos os campos'); return }
    setSaving(true)
    const prod = produtos.find(p=>p.id===prodId)
    await addDoc(collection(db,'movimentos'),{
      prodId, prodNome:prod?.nome||'', tipo,
      qtd:Number(qtd), motivo:motivo||'', data,
      stockAntes:prod?.stockActual||0,
      stockDepois:tipo==='entrada'?(prod?.stockActual||0)+Number(qtd):(prod?.stockActual||0)-Number(qtd)
    })
    // Actualizar stock
    const {updateDoc, doc} = await import('firebase/firestore')
    const novoStock = tipo==='entrada'
      ? (prod?.stockActual||0)+Number(qtd)
      : Math.max(0,(prod?.stockActual||0)-Number(qtd))
    await updateDoc(doc(db,'produtos',prodId),{stockActual:novoStock})
    showToast(`✅ Movimento de ${tipo} registado`)
    setSaving(false); setModal(false); load()
  }

  const lista = filtroTipo ? movimentos.filter(m=>m.tipo===filtroTipo) : movimentos
  const totalEntradas = movimentos.filter(m=>m.tipo==='entrada').reduce((s,m)=>s+m.qtd,0)
  const totalSaidas = movimentos.filter(m=>m.tipo==='saida').reduce((s,m)=>s+m.qtd,0)

  if (loading) return <div className="spinner"/>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">↕️ Movimentos de Stock</div>
          <div className="page-sub">Registo de entradas e saídas</div>
        </div>
        <button className="btn btn-primary" onClick={()=>{setForm({prodId:produtos[0]?.id||'',tipo:'entrada',qtd:'',motivo:'',data:today()});setModal(true)}}>+ Novo Movimento</button>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
        <div className="stat-card" style={{'--card-color':'var(--green)','--card-bg':'rgba(16,185,129,.1)'}}>
          <div className="icon">📥</div>
          <div className="stat-label">Total Entradas</div>
          <div className="stat-value" style={{color:'var(--green2)'}}>{totalEntradas}</div>
          <div className="stat-sub">unidades</div>
        </div>
        <div className="stat-card" style={{'--card-color':'var(--red)','--card-bg':'rgba(239,68,68,.1)'}}>
          <div className="icon">📤</div>
          <div className="stat-label">Total Saídas</div>
          <div className="stat-value" style={{color:'var(--red2)'}}>{totalSaidas}</div>
          <div className="stat-sub">unidades</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Histórico de Movimentos</div>
          <div className="card-actions">
            <button className={`btn btn-sm ${filtroTipo===''?'btn-primary':'btn-ghost'}`} onClick={()=>setFiltroTipo('')}>Todos</button>
            <button className={`btn btn-sm ${filtroTipo==='entrada'?'btn-green':'btn-ghost'}`} onClick={()=>setFiltroTipo('entrada')}>📥 Entradas</button>
            <button className={`btn btn-sm ${filtroTipo==='saida'?'btn-red':'btn-ghost'}`} onClick={()=>setFiltroTipo('saida')}>📤 Saídas</button>
          </div>
        </div>
        {lista.length===0
          ? <div className="empty"><div className="empty-icon">↕️</div><div className="empty-title">Sem movimentos</div><div className="empty-sub">Registe entradas e saídas de stock</div></div>
          : <div className="move-list">
              {lista.map(m=>(
                <div className="move-item" key={m.id}>
                  <div className={`move-dot ${m.tipo==='entrada'?'in':'out'}`}/>
                  <div className="move-body">
                    <div className="move-title">{m.prodNome}</div>
                    <div className="move-meta">{m.motivo||'—'} · {m.data} · Stock: {m.stockAntes}→{m.stockDepois}</div>
                  </div>
                  <div className={`move-amount ${m.tipo==='entrada'?'move-in':'move-out'}`}>
                    {m.tipo==='entrada'?'+':'-'}{m.qtd}
                  </div>
                  <span className={`badge ${m.tipo==='entrada'?'badge-ok':'badge-out'}`}>
                    {m.tipo==='entrada'?'📥 Entrada':'📤 Saída'}
                  </span>
                </div>
              ))}
            </div>
        }
      </div>

      {modal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-drag"/>
            <h3>Novo Movimento de Stock</h3>
            <div className="field"><label>Produto</label>
              <select value={form.prodId} onChange={e=>setForm(p=>({...p,prodId:e.target.value}))}>
                {produtos.map(p=><option key={p.id} value={p.id}>{p.nome} (stock: {p.stockActual} {p.unidade})</option>)}
              </select>
            </div>
            <div className="field-row">
              <div className="field"><label>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>
                  <option value="entrada">📥 Entrada</option>
                  <option value="saida">📤 Saída</option>
                </select>
              </div>
              <div className="field"><label>Quantidade</label>
                <input type="number" min="1" value={form.qtd} onChange={e=>setForm(p=>({...p,qtd:e.target.value}))}/>
              </div>
            </div>
            <div className="field"><label>Motivo</label>
              <input value={form.motivo} onChange={e=>setForm(p=>({...p,motivo:e.target.value}))} placeholder="Ex: Compra de stock, Devolução..."/>
            </div>
            <div className="field"><label>Data</label>
              <input type="date" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))}/>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className={`btn ${form.tipo==='entrada'?'btn-green':'btn-red'}`} onClick={save} disabled={saving}>{saving?'A guardar...':'Registar'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
