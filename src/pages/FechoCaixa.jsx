import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, query, orderBy, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useToast } from '../hooks/useToast'

const fmt = n => Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)

export default function FechoCaixa() {
  const [vendas, setVendas] = useState([])
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSel, setDataSel] = useState(today())
  const [form, setForm] = useState({ fisico: '', eMola: '', mpesa: '', despesas: '', outros: '', notas: '' })
  const [saving, setSaving] = useState(false)
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

  const fisico = Number(form.fisico) || 0
  const eMola = Number(form.eMola) || 0
  const mpesa = Number(form.mpesa) || 0
  const despesas = Number(form.despesas) || 0
  const outros = Number(form.outros) || 0

  const totalEntregue = fisico + eMola + mpesa
  const totalSaidas = despesas + outros
  const resultado = totalVendas - totalEntregue - totalSaidas
  const isLucro = resultado >= 0

  const jaFechado = historico.find(h => h.data === dataSel)

  const salvar = async () => {
    if (!dataSel) { showToast('⚠️ Seleccione a data'); return }
    if (jaFechado) { showToast('⚠️ Esta data já tem fecho registado'); return }
    setSaving(true)
    await addDoc(collection(db, 'fechos'), {
      data: dataSel,
      totalVendas,
      fisico, eMola, mpesa,
      despesas, outros,
      totalEntregue,
      totalSaidas,
      resultado,
      tipo: isLucro ? 'lucro' : 'desfalque',
      notas: form.notas || '',
      criadoEm: new Date().toISOString(),
    })
    showToast(isLucro ? '✅ Fecho guardado — Lucro!' : '⚠️ Fecho guardado — Desfalque!')
    setSaving(false)
    setForm({ fisico: '', eMola: '', mpesa: '', despesas: '', outros: '', notas: '' })
    load()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">💰 Fecho de Caixa</div>
          <div className="page-sub">Controlo diário de dinheiro</div>
        </div>
      </div>

      {/* Selector de data */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="field" style={{ margin: 0, flex: 1 }}>
              <label>📅 Data do Fecho</label>
              <input type="date" value={dataSel} onChange={e => setDataSel(e.target.value)} />
            </div>
            {jaFechado && (
              <span className="badge" style={{ background: 'rgba(245,158,11,.15)', color: 'var(--amber2)', marginTop: 20 }}>
                ✓ Já fechado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Total vendas do dia */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 16 }}>
        <div className="stat-card" style={{ '--card-color': 'var(--accent)', '--card-bg': 'rgba(14,165,233,.1)' }}>
          <div className="icon">🛒</div>
          <div className="stat-label">Vendas do Dia</div>
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 18 }}>{fmt(totalVendas)} MT</div>
          <div className="stat-sub">{vendasDia.length} venda(s)</div>
        </div>
        <div className="stat-card" style={{ '--card-color': isLucro ? 'var(--green)' : 'var(--red)', '--card-bg': isLucro ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)' }}>
          <div className="icon">{isLucro ? '📈' : '📉'}</div>
          <div className="stat-label">{isLucro ? 'Lucro' : 'Desfalque'}</div>
          <div className="stat-value" style={{ color: isLucro ? 'var(--green2)' : 'var(--red2)', fontSize: 18 }}>
            {isLucro ? '+' : ''}{fmt(resultado)} MT
          </div>
          <div className="stat-sub">{isLucro ? 'Está tudo bem ✅' : 'Falta dinheiro ❌'}</div>
        </div>
      </div>

      {/* Formulário */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">💵 Dinheiro Recebido</div>
        </div>
        <div className="card-body">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Introduza o dinheiro que está na sua posse agora
          </div>

          <div className="field">
            <label>💵 Dinheiro Físico (notas e moedas)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.fisico} onChange={e => f('fisico', e.target.value)} />
          </div>
          <div className="field">
            <label>📱 M-Pesa recebido</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.mpesa} onChange={e => f('mpesa', e.target.value)} />
          </div>
          <div className="field">
            <label>📲 e-Mola recebido</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.eMola} onChange={e => f('eMola', e.target.value)} />
          </div>

          {/* Linha divisória */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Saídas do dia</div>

          <div className="field">
            <label>💸 Despesas pagas hoje</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.despesas} onChange={e => f('despesas', e.target.value)} />
          </div>
          <div className="field">
            <label>📝 Outros (saídas diversas)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.outros} onChange={e => f('outros', e.target.value)} />
          </div>
          <div className="field">
            <label>📋 Notas / Observações</label>
            <input placeholder="Ex: faltou trocar, cliente devia..." value={form.notas} onChange={e => f('notas', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Resumo do cálculo */}
      <div className="card" style={{ marginBottom: 16, border: `1px solid ${isLucro ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}` }}>
        <div className="card-header">
          <div className="card-title">🧮 Cálculo</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>Total Vendas</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'Space Grotesk' }}>{fmt(totalVendas)} MT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— Dinheiro Físico</span>
              <span style={{ color: 'var(--red2)', fontFamily: 'Space Grotesk' }}>- {fmt(fisico)} MT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— M-Pesa</span>
              <span style={{ color: 'var(--red2)', fontFamily: 'Space Grotesk' }}>- {fmt(mpesa)} MT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— e-Mola</span>
              <span style={{ color: 'var(--red2)', fontFamily: 'Space Grotesk' }}>- {fmt(eMola)} MT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— Despesas</span>
              <span style={{ color: 'var(--red2)', fontFamily: 'Space Grotesk' }}>- {fmt(despesas)} MT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— Outros</span>
              <span style={{ color: 'var(--red2)', fontFamily: 'Space Grotesk' }}>- {fmt(outros)} MT</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{isLucro ? '✅ Lucro' : '❌ Desfalque'}</span>
              <span style={{ color: isLucro ? 'var(--green2)' : 'var(--red2)', fontWeight: 800, fontSize: 18, fontFamily: 'Space Grotesk' }}>
                {isLucro ? '+' : ''}{fmt(resultado)} MT
              </span>
            </div>
          </div>
        </div>
      </div>

      <button className={`btn ${isLucro ? 'btn-green' : 'btn-red'}`}
        style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15, marginBottom: 24 }}
        onClick={salvar} disabled={saving || !!jaFechado}>
        {jaFechado ? '✓ Já fechado para esta data' : saving ? 'A guardar...' : `Fechar Caixa — ${isLucro ? 'Lucro' : 'Desfalque'} de ${fmt(Math.abs(resultado))} MT`}
      </button>

      {/* Histórico */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Histórico de Fechos</div></div>
        {historico.length === 0
          ? <div className="empty"><div className="empty-icon">💰</div><div className="empty-sub">Sem fechos registados</div></div>
          : <div className="move-list">
              {historico.map(h => (
                <div className="move-item" key={h.id}>
                  <div className={`move-dot ${h.tipo === 'lucro' ? 'in' : 'out'}`} />
                  <div className="move-body">
                    <div className="move-title">{h.data}</div>
                    <div className="move-meta">
                      Vendas: {fmt(h.totalVendas)} · Físico: {fmt(h.fisico)} · M-Pesa: {fmt(h.mpesa || 0)} · e-Mola: {fmt(h.eMola || 0)}
                      {h.notas ? ` · ${h.notas}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`move-amount ${h.tipo === 'lucro' ? 'move-in' : 'move-out'}`}>
                      {h.tipo === 'lucro' ? '+' : ''}{fmt(h.resultado)} MT
                    </div>
                    <span className={`badge ${h.tipo === 'lucro' ? 'badge-ok' : 'badge-out'}`}>
                      {h.tipo === 'lucro' ? '✅ Lucro' : '❌ Desfalque'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
