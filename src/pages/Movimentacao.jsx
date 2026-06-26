import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, query, orderBy, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useToast } from '../hooks/useToast.jsx'

const fmt = n => Number(n).toLocaleString('pt-MZ',{minimumFractionDigits:2,maximumFractionDigits:2})
const today = () => new Date().toISOString().slice(0,10)

const TIPOS = [
  { value:'entrada', label:'Entrada', icon:'⬆️', color:'var(--green)' },
  { value:'saida', label:'Saída Manual', icon:'⬇️', color:'var(--red)' },
  { value:'ajuste', label:'Ajuste de Stock', icon:'🔧', color:'var(--yellow)' },
  { value:'inicial', label:'Stock Inicial', icon:'📦', color:'var(--teal)' },
]

export default function Movimentacao() {
  const [movs, setMovs] = useState([])
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ prodId:'', tipo:'entrada', qtd:'', motivo:'', data:today() })
  const [saving, setSaving] = useState(false)
  const [filtrotipo, setFiltrotipo] = useState('')
  const { toast, showToast } = useToast()

  const load = async () => {
    const [ms, ps] = await Promise.all([
      getDocs(query(collection(db,'movimentacoes'),orderBy('data','desc'))),
      getDocs(collection(db,'produtos')),
    ])
    setMovs(ms.docs.map(d=>({id:d.id,...d.data()})))
    setProdutos(ps.docs.map(d=>({id:d.id,...d.data()})))
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const save = async () => {
    const { prodId, tipo, qtd, motivo, data } = form
    if (!prodId||!qtd||!data) { showToast('⚠️ Preencha todos os campos obrigatórios'); return }
    const prod = produtos.find(p=>p.id===prodId); if(!prod) return
    const q = Number(qtd)
    if (q<=0) { showToast('⚠️ Quantidade deve ser maior que zero'); return }
    setSaving(true)
    // Calcular novo stock
    let novoStock = prod.stockActual
    if (tipo==='entrada'||tipo==='inicial') novoStock += q
    else if (tipo==='saida') { if(q>prod.stockActual){showToast(`⚠️ Stock insuficiente (${prod.stockActual} ${prod.unidade})`);setSaving(false);return;} novoStock -= q }
    else if (tipo==='ajuste') novoStock = q // ajuste define o valor exacto

    await Promise.all([
      addDoc(collection(db,'movimentacoes'),{
        prodId, prodNome:prod.nome, tipo, qtd:tipo==='ajuste'?q-prod.stockActual:q,
        stockAntes:prod.stockActual, stockDepois:novoStock,
        motivo:motivo||'', data, criadoEm:new Date().toISOString()
      }),
      updateDoc(doc(db,'produtos',prodId),{ stockActual:novoStock })
    ])
    showToast('✅ Movimentação registada')
    setSaving(false); setModal(false); load()
  }

  const lista = filtrotipo ? movs.filter(m=>m.tipo===filtrotipo) : movs
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const tipoInfo = (tipo) => TIPOS.find(t=>t.value===tipo)||TIPOS[0]

  if (loading) return <div className="spinner" />

  // Stats
  const totalEntradas = movs.filter(m=>m.tipo==='entrada'||m.tipo==='inicial').reduce((s,m)=>s+Math.abs(m.qtd||0),0)
  const totalSaidas = movs.filter(m=>m.tipo==='saida').reduce((s,m)=>s+Math.abs(m.qtd||0),0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">🔄 Movimentação de Stock</div>
          <div className="page-subtitle">Entradas, saídas e ajustes de inventário</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={()=>{ setForm({prodId:'',tipo:'entrada',qtd:'',motivo:'',data:today()}); setModal(true) }}>+ Registar</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon green">⬆️</div>
          <div className="stat-label">Total Entradas</div>
          <div className="stat-value" style={{color:'var(--green)'}}>{totalEntradas}</div>
          <div className="stat-sub">unidades</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red">⬇️</div>
          <div className="stat-label">Total Saídas</div>
          <div className="stat-value" style={{color:'var(--red)'}}>{totalSaidas}</div>
          <div className="stat-sub">unidades</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-icon teal">📋</div>
          <div className="stat-label">Total Movimentos</div>
          <div className="stat-value" style={{color:'var(--teal)'}}>{movs.length}</div>
          <div className="stat-sub">registos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">📦</div>
          <div className="stat-label">Produtos</div>
          <div className="stat-value" style={{color:'var(--accent)'}}>{produtos.length}</div>
          <div className="stat-sub">em catálogo</div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Histórico de Movimentos</span>
          <div className="table-actions">
            {['','entrada','saida','ajuste','inicial'].map(t=>(
              <button key={t} className={`btn btn-sm ${filtrotipo===t?'btn-primary':'btn-ghost'}`}
                onClick={()=>setFiltrotipo(t)}>
                {t===''?'Todos':t==='entrada'?'⬆️ Entradas':t==='saida'?'⬇️ Saídas':t==='ajuste'?'🔧 Ajustes':'📦 Iniciais'}
              </button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Stock Antes</th><th>Stock Depois</th><th>Motivo</th><th>Data</th></tr></thead>
            <tbody>
              {lista.length===0
                ? <tr><td colSpan={7}><div className="empty"><div className="empty-icon">🔄</div><div className="empty-title">Sem movimentos</div><div className="empty-sub">Registe a primeira movimentação</div></div></td></tr>
                : lista.map(m=>{
                    const t = tipoInfo(m.tipo)
                    return (
                      <tr key={m.id}>
                        <td><strong>{m.prodNome}</strong></td>
                        <td><span className="badge" style={{background:`rgba(0,0,0,.2)`,color:t.color,border:`1px solid ${t.color}30`}}>{t.icon} {t.label}</span></td>
                        <td style={{color:m.tipo==='saida'?'var(--red)':m.tipo==='ajuste'&&m.qtd<0?'var(--red)':'var(--green)',fontWeight:600}}>
                          {m.tipo==='saida'?'-':m.tipo==='ajuste'&&m.qtd<0?'':'+'}
                          {Math.abs(m.qtd||0)}
                        </td>
                        <td style={{color:'var(--text2)'}}>{m.stockAntes}</td>
                        <td style={{fontWeight:600}}>{m.stockDepois}</td>
                        <td style={{color:'var(--text2)',fontSize:12}}>{m.motivo||'—'}</td>
                        <td style={{color:'var(--text2)',fontSize:12}}>{m.data}</td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {modal&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <h3>Registar Movimentação</h3>
            <div className="field"><label>Produto *</label>
              <select value={form.prodId} onChange={e=>f('prodId',e.target.value)}>
                <option value="">Seleccione um produto...</option>
                {produtos.map(p=><option key={p.id} value={p.id}>{p.nome} — stock: {p.stockActual} {p.unidade}</option>)}
              </select>
            </div>
            <div className="field"><label>Tipo de Movimentação *</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
                {TIPOS.map(t=>(
                  <button key={t.value} type="button"
                    onClick={()=>f('tipo',t.value)}
                    style={{
                      padding:'10px 12px',borderRadius:8,fontSize:13,fontWeight:600,
                      border:`2px solid ${form.tipo===t.value?t.color:'var(--border2)'}`,
                      background:form.tipo===t.value?`${t.color}15`:'var(--surface2)',
                      color:form.tipo===t.value?t.color:'var(--text2)',
                      cursor:'pointer',textAlign:'left',
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>{form.tipo==='ajuste'?'Novo Stock Total *':'Quantidade *'}</label>
              <input type="number" min="0" value={form.qtd} onChange={e=>f('qtd',e.target.value)}
                placeholder={form.tipo==='ajuste'?'Escreva o stock correcto...':'Quantidade a movimentar...'}/>
            </div>
            <div className="field"><label>Motivo / Observação</label>
              <input value={form.motivo} onChange={e=>f('motivo',e.target.value)} placeholder="Ex: Compra em Nampula, Avaria, Inventário..."/>
            </div>
            <div className="field"><label>Data *</label>
              <input type="date" value={form.data} onChange={e=>f('data',e.target.value)}/>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'A registar...':'Registar'}</button>
            </div>
          </div>
        </div>
      )}
      {toast&&<div className="toast">{toast}</div>}
    </div>
  )
}
