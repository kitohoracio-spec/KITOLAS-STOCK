import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore'
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

  const fisico    = Number(form.fisico)    || 0
  const eMola     = Number(form.eMola)     || 0
  const mpesa     = Number(form.mpesa)     || 0
  const despesas  = Number(form.despesas)  || 0
  const outros    = Number(form.outros)    || 0

  const totalEntregue = fisico + eMola + mpesa
  const totalSaidas   = despesas + outros

  // Lógica correcta:
  // dinheiro em falta = Vendas - Entregue - Saídas
  // Se positivo → DESFALQUE (falta esse dinheiro)
  // Se zero     → CAIXA CERTINHA
  // Se negativo → SOBRA (raro)
  const diferenca = totalVendas - totalEntregue - totalSaidas
  const isDesfalque = diferenca > 0
  const isSobra     = diferenca < 0
  const isExacto    = diferenca === 0

  const tipoResultado = isDesfalque ? 'desfalque' : isSobra ? 'sobra' : 'exacto'
  const corResultado  = isDesfalque ? 'var(--red2)' : 'var(--green2)'
  const iconeResult   = isDesfalque ? '❌' : isSobra ? '📈' : '✅'
  const labelResult   = isDesfalque ? 'DESFALQUE' : isSobra ? 'SOBRA' : 'CAIXA CERTINHA'

  const jaFechado = historico.find(h => h.data === dataSel)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const salvar = async () => {
    if (!dataSel) { showToast('⚠️ Seleccione a data'); return }
    if (jaFechado) { showToast('⚠️ Esta data já tem fecho registado'); return }
    setSaving(true)
    await addDoc(collection(db, 'fechos'), {
      data: dataSel,
      totalVendas, fisico, eMola, mpesa,
      despesas, outros,
      totalEntregue, totalSaidas,
      diferenca,
      tipo: tipoResultado,
      notas: form.notas || '',
      criadoEm: new Date().toISOString(),
    })
    showToast(isDesfalque ? `⚠️ Desfalque de ${fmt(diferenca)} MT` : `✅ Caixa fechada!`)
    setSaving(false)
    setForm({ fisico: '', eMola: '', mpesa: '', despesas: '', outros: '', notas: '' })
    load()
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">💰 Fecho de Caixa</div>
          <div className="page-sub">Controlo diário — detecta desfalques automaticamente</div>
        </div>
      </div>

      {/* Data */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div className="field" style={{ margin: 0, flex: 1 }}>
              <label>📅 Data do Fecho</label>
              <input type="date" value={dataSel} onChange={e => setDataSel(e.target.value)} />
            </div>
            {jaFechado && <span className="badge badge-low" style={{ marginBottom: 2 }}>✓ Já fechado</span>}
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
          <div className="icon">{iconeResult}</div>
          <div className="stat-label">{labelResult}</div>
          <div className="stat-value" style={{ color: corResultado, fontSize: 18 }}>
            {fmt(Math.abs(diferenca))}
          </div>
          <div className="stat-sub">
            {isDesfalque ? 'Falta este dinheiro ❌' : isSobra ? 'Sobra este valor 🤔' : 'Tudo confere ✅'}
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">💵 Dinheiro na sua Posse</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>O que tem em mão agora</div>
        </div>
        <div className="card-body">
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

          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>💸 Saídas do dia (dinheiro que saiu da caixa)</div>
          </div>

          <div className="field">
            <label>💸 Despesas pagas hoje</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.despesas} onChange={e => f('despesas', e.target.value)} />
          </div>
          <div className="field">
            <label>📝 Outros (trocos, saídas diversas)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.outros} onChange={e => f('outros', e.target.value)} />
          </div>
          <div className="field">
            <label>📋 Notas / Observações</label>
            <input placeholder="Ex: faltou trocar, cliente devia..."
              value={form.notas} onChange={e => f('notas', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Cálculo detalhado */}
      <div className="card" style={{ marginBottom: 16, border: `1px solid ${isDesfalque ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}` }}>
        <div className="card-header"><div className="card-title">🧮 Cálculo Detalhado</div></div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Vendas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>Total de Vendas</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'Space Grotesk' }}>{fmt(totalVendas)} MT</span>
            </div>

            <div style={{ borderTop: '1px dashed var(--border)', margin: '4px 0' }} />

            {/* Entregues */}
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Dinheiro entregue</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— Físico</span>
              <span style={{ fontFamily: 'Space Grotesk' }}>- {fmt(fisico)} MT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— M-Pesa</span>
              <span style={{ fontFamily: 'Space Grotesk' }}>- {fmt(mpesa)} MT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— e-Mola</span>
              <span style={{ fontFamily: 'Space Grotesk' }}>- {fmt(eMola)} MT</span>
            </div>

            <div style={{ borderTop: '1px dashed var(--border)', margin: '4px 0' }} />

            {/* Saídas */}
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Saídas</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— Despesas</span>
              <span style={{ fontFamily: 'Space Grotesk' }}>- {fmt(despesas)} MT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>— Outros</span>
              <span style={{ fontFamily: 'Space Grotesk' }}>- {fmt(outros)} MT</span>
            </div>

            <div style={{ borderTop: '2px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{iconeResult} {labelResult}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {isDesfalque
                    ? `Faltam ${fmt(diferenca)} MT — alguém ficou com este dinheiro`
                    : isSobra
                    ? `Sobram ${fmt(Math.abs(diferenca))} MT — verifique os valores`
                    : 'Caixa fechada com exactidão'}
                </div>
              </div>
              <span style={{ color: corResultado, fontWeight: 800, fontSize: 22, fontFamily: 'Space Grotesk' }}>
                {fmt(Math.abs(diferenca))} MT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botão fechar */}
      <button
        className={`btn ${isDesfalque ? 'btn-red' : 'btn-green'}`}
        style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15, marginBottom: 24 }}
        onClick={salvar}
        disabled={saving || !!jaFechado}>
        {jaFechado
          ? '✓ Já fechado para esta data'
          : saving
          ? 'A guardar...'
          : `Fechar Caixa · ${iconeResult} ${labelResult} · ${fmt(Math.abs(diferenca))} MT`}
      </button>

      {/* Histórico */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Histórico de Fechos</div></div>
        {historico.length === 0
          ? <div className="empty"><div className="empty-icon">💰</div><div className="empty-sub">Sem fechos registados</div></div>
          : <div className="move-list">
              {historico.map(h => (
                <div className="move-item" key={h.id}>
                  <div className={`move-dot ${h.tipo === 'desfalque' ? 'out' : 'in'}`} />
                  <div className="move-body">
                    <div className="move-title">{h.data}</div>
                    <div className="move-meta">
                      Vendas: {fmt(h.totalVendas)} MT · Físico: {fmt(h.fisico)} · M-Pesa: {fmt(h.mpesa || 0)} · e-Mola: {fmt(h.eMola || 0)}
                      {h.despesas ? ` · Desp: ${fmt(h.despesas)}` : ''}
                      {h.notas ? ` · "${h.notas}"` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className={`move-amount ${h.tipo === 'desfalque' ? 'move-out' : 'move-in'}`} style={{ marginBottom: 4 }}>
                      {fmt(Math.abs(h.diferenca || 0))} MT
                    </div>
                    <span className={`badge ${h.tipo === 'desfalque' ? 'badge-out' : 'badge-ok'}`}>
                      {h.tipo === 'desfalque' ? '❌ Desfalque' : h.tipo === 'sobra' ? '📈 Sobra' : '✅ Exacto'}
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
