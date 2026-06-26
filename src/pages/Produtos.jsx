import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useToast } from '../hooks/useToast.jsx'
import * as XLSX from 'xlsx'

const fmt = n => Number(n).toLocaleString('pt-MZ', {minimumFractionDigits:2, maximumFractionDigits:2})
const today = () => new Date().toISOString().slice(0,10)
const CATS = ['Cereais e Grãos','Óleos e Gorduras','Bebidas','Condimentos','Higiene','Laticínios','Carne e Peixe','Frutas e Vegetais','Outros']
const UNIS = ['un','kg','L','fardo','cx','dz','saco','pacote']
const CLOUD = { cloud:'dztfjib6h', preset:'zura_unsigned', folder:'kitolas' }

const blank = { nome:'', categoria:'Cereais e Grãos', stockAnterior:0, stockActual:0, stockMinimo:5, precoCompra:0, precoVenda:0, unidade:'un', dataEntrada:today(), dataValidade:'', dataAnterior:'', imagem:'' }

function StockBadge({p}) {
  if (p.stockActual<=0) return <span className="badge badge-out">Esgotado</span>
  if (p.stockActual<=p.stockMinimo) return <span className="badge badge-low">Stock Baixo</span>
  return <span className="badge badge-ok">OK</span>
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(blank)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [view, setView] = useState('grid')
  const [busca, setBusca] = useState('')
  const { toast, showToast } = useToast()

  const load = async () => {
    const snap = await getDocs(collection(db, 'produtos'))
    setProdutos(snap.docs.map(d => ({id:d.id,...d.data()})))
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  const uploadImagem = async (file) => {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', CLOUD.preset)
    fd.append('folder', CLOUD.folder)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD.cloud}/image/upload`, {method:'POST',body:fd})
    const data = await res.json()
    f('imagem', data.secure_url)
    setUploading(false)
    showToast('✅ Imagem carregada')
  }

  const save = async () => {
    if (!form.nome.trim()) { showToast('⚠️ Insira o nome'); return }
    setSaving(true)
    const data = { nome:form.nome.trim(), categoria:form.categoria, stockAnterior:Number(form.stockAnterior)||0, stockActual:Number(form.stockActual)||0, stockMinimo:Number(form.stockMinimo)||5, precoCompra:Number(form.precoCompra)||0, precoVenda:Number(form.precoVenda)||0, unidade:form.unidade, dataEntrada:form.dataEntrada||today(), dataValidade:form.dataValidade||'', dataAnterior:form.dataAnterior||'', imagem:form.imagem||'' }
    if (editId) { await updateDoc(doc(db,'produtos',editId),data); showToast('✅ Produto actualizado') }
    else { await addDoc(collection(db,'produtos'),data); showToast('✅ Produto adicionado') }
    setSaving(false); setModal(false); load()
  }

  const del = async (id) => {
    if (!confirm('Eliminar produto?')) return
    await deleteDoc(doc(db,'produtos',id)); showToast('🗑️ Eliminado'); load()
  }

  const openNew = () => { setForm(blank); setEditId(null); setModal(true) }
  const openEdit = (p) => { setForm({...blank,...p}); setEditId(p.id); setModal(true) }

  const exportExcel = () => {
    const rows=[['Nome','Categoria','Stock Ant.','Stock Act.','Uni','P.Compra','P.Venda','Mín','Estado','Dt.Entrada','Dt.Anterior','Dt.Validade']]
    produtos.forEach(p=>{const est=p.stockActual<=0?'Esgotado':p.stockActual<=p.stockMinimo?'Baixo':'OK'; rows.push([p.nome,p.categoria,p.stockAnterior,p.stockActual,p.unidade,p.precoCompra,p.precoVenda,p.stockMinimo,est,p.dataEntrada||'',p.dataAnterior||'',p.dataValidade||''])})
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Produtos'); XLSX.writeFile(wb,'kitolas_produtos.xlsx')
  }

  const lista = produtos.filter(p => {
    if (filtro && p.categoria !== filtro) return false
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const expirados = produtos.filter(p => p.dataValidade && new Date(p.dataValidade) < new Date())

  if (loading) return <div className="spinner"/>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">📦 Produtos</div>
          <div className="page-sub">{lista.length} produto(s) · {expirados.length > 0 && <span style={{color:'var(--red2)'}}>{expirados.length} expirado(s)</span>}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Excel</button>
          <button className="btn btn-primary" onClick={openNew}>+ Novo Produto</button>
        </div>
      </div>

      {expirados.length > 0 && (
        <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:12,padding:'12px 16px',marginBottom:16}}>
          <div style={{color:'var(--red2)',fontWeight:600,fontSize:13,marginBottom:6}}>⚠️ Produtos com validade expirada</div>
          {expirados.map(p=><div key={p.id} style={{fontSize:12,color:'var(--muted)'}}> • {p.nome} — {p.dataValidade}</div>)}
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{padding:'10px 14px',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <input placeholder="🔍 Pesquisar produto..." value={busca} onChange={e=>setBusca(e.target.value)}
            style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',padding:'7px 12px',fontSize:13,outline:'none',flex:1,minWidth:150}} />
          <select value={filtro} onChange={e=>setFiltro(e.target.value)}
            style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',padding:'7px 10px',fontSize:13,outline:'none'}}>
            <option value="">Todas categorias</option>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <button className={`btn btn-sm ${view==='grid'?'btn-primary':'btn-ghost'}`} onClick={()=>setView('grid')}>⊞</button>
          <button className={`btn btn-sm ${view==='list'?'btn-primary':'btn-ghost'}`} onClick={()=>setView('list')}>☰</button>
        </div>
      </div>

      {/* GRID VIEW */}
      {view==='grid' && (
        <div className="card">
          {lista.length===0
            ? <div className="empty"><div className="empty-icon">📦</div><div className="empty-title">Sem produtos</div><div className="empty-sub">Clique em "+ Novo Produto" para começar</div></div>
            : <div className="prod-grid">
                {lista.map(p=>(
                  <div className="prod-card" key={p.id} onClick={()=>openEdit(p)}>
                    <div className="prod-img">
                      {p.imagem ? <img src={p.imagem} alt={p.nome}/> : <span>📦</span>}
                    </div>
                    <div className="prod-info">
                      <div className="prod-name">{p.nome}</div>
                      <div className="prod-price">{fmt(p.precoVenda)} MT</div>
                      <div className="prod-stock">{p.stockActual} {p.unidade} em stock</div>
                      <div style={{marginTop:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <StockBadge p={p}/>
                        <button className="btn btn-red btn-sm" onClick={e=>{e.stopPropagation();del(p.id)}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* LIST VIEW */}
      {view==='list' && (
        <div className="card">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Produto</th><th>Cat.</th><th>Ant.</th><th>Act.</th><th>P.Compra</th><th>P.Venda</th><th>Dt.Entrada</th><th>Dt.Anterior</th><th>Dt.Validade</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {lista.length===0
                  ? <tr><td colSpan={11} className="empty">Sem produtos</td></tr>
                  : lista.map(p=>(
                    <tr key={p.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {p.imagem
                            ? <img src={p.imagem} style={{width:32,height:32,borderRadius:6,objectFit:'cover'}}/>
                            : <div style={{width:32,height:32,borderRadius:6,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>📦</div>}
                          <strong>{p.nome}</strong>
                        </div>
                      </td>
                      <td style={{color:'var(--muted)',fontSize:12}}>{p.categoria}</td>
                      <td>{p.stockAnterior} {p.unidade}</td>
                      <td><strong>{p.stockActual} {p.unidade}</strong></td>
                      <td style={{fontSize:12}}>{fmt(p.precoCompra)} MT</td>
                      <td style={{color:'var(--green2)',fontWeight:700}}>{fmt(p.precoVenda)} MT</td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{p.dataEntrada||'—'}</td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{p.dataAnterior||'—'}</td>
                      <td style={{fontSize:12,color:p.dataValidade&&new Date(p.dataValidade)<new Date()?'var(--red2)':'var(--muted)'}}>{p.dataValidade||'—'}</td>
                      <td><StockBadge p={p}/></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(p)}>✏️</button>
                        <button className="btn btn-red btn-sm" style={{marginLeft:4}} onClick={()=>del(p.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-drag"/>
            <h3>{editId?'Editar Produto':'Novo Produto'}</h3>

            {/* Upload imagem */}
            <div className="field">
              <label>📷 Imagem do Produto</label>
              <label className="upload-zone" style={{cursor:'pointer'}}>
                <input type="file" accept="image/*" onChange={e=>uploadImagem(e.target.files[0])} style={{display:'none'}}/>
                {form.imagem
                  ? <img src={form.imagem} className="upload-preview"/>
                  : <div style={{color:'var(--muted)',fontSize:13}}>{uploading?'⏳ A carregar...':'📷 Toque para adicionar foto'}</div>}
              </label>
            </div>

            <div className="field"><label>Nome</label><input value={form.nome} onChange={e=>f('nome',e.target.value)} placeholder="Ex: Arroz 5kg"/></div>
            <div className="field"><label>Categoria</label>
              <select value={form.categoria} onChange={e=>f('categoria',e.target.value)}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field-row">
              <div className="field"><label>Stock Anterior</label><input type="number" min="0" value={form.stockAnterior} onChange={e=>f('stockAnterior',e.target.value)}/></div>
              <div className="field"><label>Stock Actual</label><input type="number" min="0" value={form.stockActual} onChange={e=>f('stockActual',e.target.value)}/></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Stock Mínimo</label><input type="number" min="0" value={form.stockMinimo} onChange={e=>f('stockMinimo',e.target.value)}/></div>
              <div className="field"><label>Unidade</label>
                <select value={form.unidade} onChange={e=>f('unidade',e.target.value)}>
                  {UNIS.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field"><label>Preço Compra (MT)</label><input type="number" min="0" step="0.01" value={form.precoCompra} onChange={e=>f('precoCompra',e.target.value)}/></div>
              <div className="field"><label>Preço Venda (MT)</label><input type="number" min="0" step="0.01" value={form.precoVenda} onChange={e=>f('precoVenda',e.target.value)}/></div>
            </div>
            <div className="field"><label>📅 Data de Entrada</label><input type="date" value={form.dataEntrada} onChange={e=>f('dataEntrada',e.target.value)}/></div>
            <div className="field"><label>📅 Data Stock Anterior</label><input type="date" value={form.dataAnterior} onChange={e=>f('dataAnterior',e.target.value)}/></div>
            <div className="field"><label>⏳ Data de Validade</label><input type="date" value={form.dataValidade} onChange={e=>f('dataValidade',e.target.value)}/></div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving||uploading}>{saving?'A guardar...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
