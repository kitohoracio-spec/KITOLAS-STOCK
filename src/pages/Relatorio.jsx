import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import * as XLSX from 'xlsx'

const fmt = n => Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const COLORS = ['#4f9eff','#7c4dff','#22d3a5','#ffc94d','#ff5b5b','#ff8c42','#c0f7ff','#a8ff78']

export default function Relatorio() {
  const [vendas, setVendas] = useState([])
  const [despesas, setDespesas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [de, setDe] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`
  })
  const [ate, setAte] = useState(new Date().toISOString().slice(0,10))

  useEffect(() => {
    async function load() {
      const [vs, ds, ps] = await Promise.all([
        getDocs(query(collection(db, 'vendas'), orderBy('data', 'desc'))),
        getDocs(query(collection(db, 'despesas'), orderBy('data', 'desc'))),
        getDocs(collection(db, 'produtos')),
      ])
      setVendas(vs.docs.map(d => ({ id: d.id, ...d.data() })))
      setDespesas(ds.docs.map(d => ({ id: d.id, ...d.data() })))
      setProdutos(ps.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [])

  const filter = (lista) => lista.filter(i => {
    if (de && i.data < de) return false
    if (ate && i.data > ate) return false
    return true
  })

  const quick = (tipo) => {
    const n = new Date()
    if (tipo === 'mes') {
      setDe(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`)
      setAte(n.toISOString().slice(0,10))
    } else if (tipo === 'semana') {
      const d = new Date(n); d.setDate(n.getDate() - n.getDay())
      setDe(d.toISOString().slice(0,10))
      setAte(n.toISOString().slice(0,10))
    } else if (tipo === 'ano') {
      setDe(`${n.getFullYear()}-01-01`)
      setAte(n.toISOString().slice(0,10))
    } else {
      setDe(''); setAte('')
    }
  }

  const fVendas = filter(vendas)
  const fDespesas = filter(despesas)
  const totalReceita = fVendas.reduce((s, v) => s + v.total, 0)
  const totalDespesas = fDespesas.reduce((s, d) => s + d.valor, 0)
  const custoProd = fVendas.reduce((s, v) => {
    const p = produtos.find(x => x.id === v.prodId)
    return s + (p ? p.precoCompra * v.qtd : 0)
  }, 0)
  const lucro = totalReceita - totalDespesas - custoProd

  // top produtos
  const map = {}
  fVendas.forEach(v => { map[v.prodNome] = (map[v.prodNome] || 0) + v.total })
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const max = sorted[0]?.[1] || 1

  const periodoTxt = de && ate ? `${de} a ${ate}` : de ? `A partir de ${de}` : ate ? `Até ${ate}` : 'Todos os períodos'

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const resumo = [
      ['Barraca KITOLAS — Relatório de Gestão'],
      ['Período', periodoTxt],
      ['Gerado em', new Date().toLocaleString('pt-PT')],
      [],
      ['RESUMO FINANCEIRO'],
      ['Receita Total (MT)', totalReceita],
      ['Total Despesas (MT)', totalDespesas],
      ['Custo de Mercadoria (MT)', custoProd],
      ['Lucro Líquido (MT)', lucro],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo')
    const vrows = [['Produto','Qtd','P.Unit','Total','Data']]
    fVendas.forEach(v => vrows.push([v.prodNome, v.qtd, v.preco, v.total, v.data]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vrows), 'Vendas')
    const drows = [['Descrição','Categoria','Valor','Data']]
    fDespesas.forEach(d => drows.push([d.desc, d.cat, d.valor, d.data]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(drows), 'Despesas')
    const prows = [['Nome','Categoria','Stock Ant.','Stock Act.','Unidade','P.Compra','P.Venda']]
    produtos.forEach(p => prows.push([p.nome,p.categoria,p.stockAnterior,p.stockActual,p.unidade,p.precoCompra,p.precoVenda]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prows), 'Produtos')
    XLSX.writeFile(wb, 'kitolas_relatorio.xlsx')
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="print-header">
        <h1>Barraca KITOLAS — Relatório de Gestão</h1>
        <p>Período: {periodoTxt} · Gerado em: {new Date().toLocaleString('pt-PT')}</p>
      </div>

      <div className="page-title no-print">📈 Relatório</div>

      {/* Filtros */}
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <div className="table-header no-print">
          <span className="table-title">🗓️ Período</span>
          <div className="table-actions">
            {['semana','mes','ano','tudo'].map(t => (
              <button key={t} className="btn btn-ghost btn-sm" onClick={() => quick(t)}>
                {t === 'semana' ? 'Esta Semana' : t === 'mes' ? 'Este Mês' : t === 'ano' ? 'Este Ano' : 'Tudo'}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-bar no-print">
          <label>De:</label>
          <input type="date" value={de} onChange={e => setDe(e.target.value)} />
          <label>Até:</label>
          <input type="date" value={ate} onChange={e => setAte(e.target.value)} />
          <span className="filter-info">{fVendas.length} venda(s), {fDespesas.length} despesa(s)</span>
        </div>
      </div>

      {/* Cartões */}
      <div className="summary-grid">
        <div className="card"><div className="card-label">Receita</div><div className="card-value" style={{ color: 'var(--green)' }}>{fmt(totalReceita)} MT</div></div>
        <div className="card"><div className="card-label">Despesas</div><div className="card-value" style={{ color: 'var(--red)' }}>{fmt(totalDespesas)} MT</div></div>
        <div className="card"><div className="card-label">Custo Mercadoria</div><div className="card-value" style={{ color: 'var(--yellow)' }}>{fmt(custoProd)} MT</div></div>
        <div className="card"><div className="card-label">Lucro Real</div><div className="card-value" style={{ color: lucro >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(lucro)} MT</div></div>
      </div>

      {/* Gráfico */}
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <div className="table-header">
          <span className="table-title">📊 Produtos Mais Vendidos</span>
          <div className="table-actions no-print">
            <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Excel</button>
            <button className="btn btn-purple btn-sm" onClick={() => window.print()}>🖨️ Imprimir PDF</button>
          </div>
        </div>
        <div className="chart-wrap">
          {sorted.length === 0
            ? <div className="empty">Sem dados de vendas no período</div>
            : sorted.map(([nome, val], i) => (
              <div className="bar-row" key={nome}>
                <div className="bar-label" title={nome}>{nome}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(val/max*100).toFixed(1)}%`, background: COLORS[i % COLORS.length] }}>
                    {(val/max*100).toFixed(0)}%
                  </div>
                </div>
                <div className="bar-val">{fmt(val)} MT</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Vendas no período */}
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <div className="table-header"><span className="table-title">🛒 Vendas no Período</span></div>
        <table>
          <thead><tr><th>Produto</th><th>Qtd</th><th>Total</th><th>Data</th></tr></thead>
          <tbody>
            {fVendas.length === 0
              ? <tr><td colSpan={4} className="empty">Sem vendas</td></tr>
              : fVendas.map(v => (
                <tr key={v.id}>
                  <td>{v.prodNome}</td><td>{v.qtd}</td>
                  <td style={{ color: 'var(--green)' }}>{fmt(v.total)} MT</td>
                  <td style={{ color: 'var(--muted)' }}>{v.data}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Despesas no período */}
      <div className="table-wrap">
        <div className="table-header"><span className="table-title">💸 Despesas no Período</span></div>
        <table>
          <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Data</th></tr></thead>
          <tbody>
            {fDespesas.length === 0
              ? <tr><td colSpan={4} className="empty">Sem despesas</td></tr>
              : fDespesas.map(d => (
                <tr key={d.id}>
                  <td>{d.desc}</td>
                  <td style={{ color: 'var(--muted)' }}>{d.cat}</td>
                  <td style={{ color: 'var(--red)' }}>{fmt(d.valor)} MT</td>
                  <td style={{ color: 'var(--muted)' }}>{d.data}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </>
  )
}
