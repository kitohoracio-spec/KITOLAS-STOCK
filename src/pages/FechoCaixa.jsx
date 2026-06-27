import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useToast } from '../hooks/useToast'

const fmt = n => Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)

const calcular = (totalVendas, fisico, eMola, mpesa, despesas, outros) => {
  const totalEntregue = fisico + eMola + mpesa
  const totalSaidas = despesas + outros
  const diferenca = totalVendas - totalEntregue - totalSaidas
  const tipo = diferenca > 0 ? 'desfalque' : diferenca < 0 ? 'sobra' : 'exacto'
  return { totalEntregue, totalSaidas, diferenca, tipo }
}

export default function FechoCaixa() {
  const [vendas, setVendas] = useState([])
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSel, setDataSel] = useState(today())
  const [form, setForm] = useState({ fisico: '', eMola: '', mpesa: '', despesas: '', outros: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [editando, setEditando] = useState(null) // id do fecho a editar
  const { toast, showToast } = useToast()

  const load = async () => {
    const [vs, hs] = await Promise.all([
      getDocs(query(collection(db, 'vendas'), orderBy('data', 'desc'))),
      getDocs(query(collection(db, 'fechos'), orderBy('data', 'desc'))),
    ])
    setVendas(vs.docs.map(d => ({ id: d.id, ...d.data() })))
    setHistorico(hs.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const vendasDia = vendas.filter(v => v.data === dataSel)
  const totalVendas = vendasDia.reduce((s, v) => s + v.total, 0)

  const fisico   = Number(form.fisico)   || 0
  const eMola    = Number(form.eMola)    || 0
  const mpesa    = Number(form.mpesa)    || 0
  const despesas = Number(form.despesas) || 0
  const outros   = Number(form.outros)   || 0

  const { totalEntregue, totalSaidas, diferenca, tipo } = calcular(totalVendas, fisico, eMola, mpesa, despesas, outros)

  const isDesfalque = tipo === 'desfalque'
  const isSobra     = tipo === 'sobra'
  const corResult   = isDesfalque ? 'var(--red2)' : 'var(--green2)'
  const icone       = isDesfalque ? '❌' : isSobra ? '📈' : '✅'
  const label       = isDesfalque ? 'DESFALQUE' : isSobra ? 'SOBRA' : 'CAIXA CERTINHA'

  const jaFechado = historico.find(h => h.data === dataSel)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Abrir edição de fecho existente
  const abrirEdicao = (h) => {
    setDataSel(h.data)
    setForm({
      fisico:    String(h.fisico    || ''),
      eMola:     String(h.eMola     || ''),
      mpesa:     String(h.mpesa     || ''),
      despesas:  String(h.despesas  || ''),
      outros:    String(h.outros    || ''),
      notas:     h.notas || '',
    })
    setEditando(h.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    showToast('✏️ A editar fecho de ' + h.data)
  }

  const cancelarEdicao = () => {
    setEditando(null)
    setForm({ fisico: '', eMola: '', mpesa: '', despesas: '', outros: '', notas: '' })
  }

  const salvar = async () => {
    if (!dataSel) { showToast('⚠️ Seleccione a data'); return }
    setSaving(true)

    const dados = {
      data: dataSel,
      totalVendas, fisico, eMola, mpesa,
      despesas, outros,
      totalEntregue, totalSaidas,
      diferenca, tipo,
      notas: form.notas || '',
      actualizadoEm: new Date().toISOString(),
    }

    if (editando) {
      // Actualizar fecho existente
      await updateDoc(doc(db, 'fechos', editando), dados)
      showToast(isDesfalque ? `⚠️ Fecho actualizado — Desfalque ${fmt(diferenca)} MT` : '✅ Fecho actualizado!')
      setEditando(null)
    } else {
      if (jaFechado) { showToast('⚠️ Esta data já tem fecho. Use o botão Editar.'); setSaving(false); return }
      // Novo fecho
      dados.criadoEm = new Date().toISOString()
      await addDoc(collection(db, 'fechos'), dados)
      showToast(isDesfalque ? `⚠️ Desfalque de ${fmt(diferenca)} MT` : '✅ Caixa fechada!')
    }

    setSaving(false)
    setForm({ fisico: '', eMola: '', mpesa: '', despesas: '', outros: '', notas: '' })
    load()
  }

  const eliminarFecho = async (id) => {
    if (!confirm('Eliminar este fecho?')) return
    await deleteDoc(doc(db, 'fechos', id))
    showToast('🗑️ Fecho eliminado')
    if (editando === id) cancelarEdicao()
    load()
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">💰 Fecho de Caixa</div>
          <div className="page-sub">Controlo diário · detecta desfalques automaticamente</div>
        </div>
        {editando && (
          <button className="btn btn-ghost btn-sm" onClick={cancelarEdicao}>✕ Cancelar edição</button>
        )}
      </div>

      {/* Aviso de edição */}
      {editando && (
        <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--amber2)' }}>
          ✏️ A editar fecho de <strong>{dataSel}</strong> — altere os valores e clique em "Guardar Alterações"
        </div>
      )}

      {/* Data */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div className="field" style={{ margin: 0, flex: 1 }}>
              <label>📅 Data do Fecho</label>
              <input type="date" value={dataSel} onChange={e => { setDataSel(e.target.value); cancelarEdicao() }} disabled={!!editando} />
            </div>
            {jaFechado && !editando && (
              <span className="badge badge-low" style={{ marginBottom: 2 }}>✓ Já fechado</span>
            )}
          </div>
        </div>
      </div>

      {/* Cards topo */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 16 }}>
        <div className="stat-card" style={{ '--card-color': 'var(--accent)', '--card-bg': 'rgba(14,165,233,.1)' }}>
          <div className="icon">🛒</div>
          <div className="stat-label">Vendas do Dia</div>
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 18 }}>{fmt(totalVendas)}</div>
          <div className="stat-sub">{vendasDia.length} venda(s) · MT</div>
        </div>
        <div className="stat-card" style={{ '--card-color': isDesfalque ? 'var(--red)' : 'var(--green)', '--card-bg': isDesfalque ? 'rgba(239,68,68,.1)' : 'rgba(16,185,129,.1)' }}>
          <div className="icon">{icone}</div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color: corResult, fontSize: 18 }}>{fmt(Math.abs(diferenca))}</div>
          <div className="stat-sub">{isDesfalque ? 'Falta este dinheiro ❌' : isSobra ? 'Sobra este valor 🤔' : 'Tudo confere ✅'}</div>
        </div>
      </div>

      {/* Formulário */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">💵 Dinheiro na sua Posse</div>
        </div>
        <div className="card-body">
          <div className="field">
            <label>💵 Dinheiro Físico</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.fisico} onChange={e => f('fisico', e.target.value)} />
          </div>
          <div className="field">
            <label>📱 M-Pesa recebido</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.mpesa} onChange={e => f('mpesa', e.target.value)} />
          </div>
          <div className="field">
            <label>📲 e-Mola recebido</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.eMola} onChange={e => f('eMola', e.target.value)} />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>💸 Saídas do dia</div>
          </div>
          <div className="field">
            <label>💸 Despesas pagas hoje</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.despesas} onChange={e => f('despesas', e.target.value)} />
          </div>
          <div className="field">
            <label>📝 Outros</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.outros} onChange={e => f('outros', e.target.value)} />
          </div>
          <div className="field">
            <label>📋 Notas</label>
            <input placeholder="Ex: faltou trocar, cliente devia..." value={form.notas} onChange={e => f('notas', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Cálculo */}
      <div className="card" style={{ marginBottom: 16, border: `1px solid ${isDesfalque ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}` }}>
        <div className="card-header"><div className="card-title">🧮 Cálculo</div></div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>Total de Vendas</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'Space Grotesk' }}>{fmt(totalVendas)} MT</span>
            </div>
            <div style={{ borderTop: '1px dashed var(--border)' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Dinheiro entregue</div>
            {[['Físico', fisico], ['M-Pesa', mpesa], ['e-Mola', eMola]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>— {k}</span>
                <span style={{ fontFamily: 'Space Grotesk' }}>- {fmt(v)} MT</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--border)' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Saídas</div>
            {[['Despesas', despesas], ['Outros', outros]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>— {k}</span>
                <span style={{ fontFamily: 'Space Grotesk' }}>- {fmt(v)} MT</span>
              </div>
            ))}
            <div style={{ borderTop: '2px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{icone} {label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {isDesfalque ? `Faltam ${fmt(diferenca)} MT — alguém ficou com este dinheiro` : isSobra ? `Sobram ${fmt(Math.abs(diferenca))} MT` : 'Caixa fechada com exactidão'}
                </div>
              </div>
              <span style={{ color: corResult, fontWeight: 800, fontSize: 22, fontFamily: 'Space Grotesk' }}>
                {fmt(Math.abs(diferenca))} MT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botão */}
      <button
        className={`btn ${isDesfalque ? 'btn-red' : 'btn-green'}`}
        style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15, marginBottom: 24 }}
        onClick={salvar} disabled={saving}>
        {saving ? 'A guardar...' : editando ? `💾 Guardar Alterações · ${icone} ${fmt(Math.abs(diferenca))} MT` : jaFechado ? '⚠️ Esta data já tem fecho — use Editar abaixo' : `Fechar Caixa · ${icone} ${label} · ${fmt(Math.abs(diferenca))} MT`}
      </button>

      {/* Histórico */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Histórico de Fechos</div></div>
        {historico.length === 0
          ? <div className="empty"><div className="empty-icon">💰</div><div className="empty-sub">Sem fechos registados</div></div>
          : <div className="move-list">
              {historico.map(h => {
                const d = h.diferenca ?? 0
                const t = h.tipo || (d > 0 ? 'desfalque' : d < 0 ? 'sobra' : 'exacto')
                return (
                  <div className="move-item" key={h.id} style={{ flexWrap: 'wrap', gap: 8 }}>
                    <div className={`move-dot ${t === 'desfalque' ? 'out' : 'in'}`} />
                    <div className="move-body">
                      <div className="move-title">{h.data}</div>
                      <div className="move-meta">
                        Vendas: {fmt(h.totalVendas)} · Físico: {fmt(h.fisico || 0)} · M-Pesa: {fmt(h.mpesa || 0)} · e-Mola: {fmt(h.eMola || 0)}
                        {h.despesas ? ` · Desp: ${fmt(h.despesas)}` : ''}
                        {h.notas ? ` · "${h.notas}"` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className={`move-amount ${t === 'desfalque' ? 'move-out' : 'move-in'}`} style={{ marginBottom: 4 }}>
                        {fmt(Math.abs(d))} MT
                      </div>
                      <span className={`badge ${t === 'desfalque' ? 'badge-out' : 'badge-ok'}`}>
                        {t === 'desfalque' ? '❌ Desfalque' : t === 'sobra' ? '📈 Sobra' : '✅ Exacto'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, width: '100%', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => abrirEdicao(h)}>✏️ Editar</button>
                      <button className="btn btn-red btn-sm" onClick={() => eliminarFecho(h.id)}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
        }
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
