import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth.jsx'

const fmt = n => Number(n).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const COLORS = ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316']

function Sparkline({ values }) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  return (
    <div className="sparkline">
      {values.map((v, i) => (
        <div key={i} className="spark-bar"
          style={{ height: `${(v/max)*100}%`, background: `rgba(14,165,233,${0.3 + (i/values.length)*0.7})` }} />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [produtos, setProdutos] = useState([])
  const [vendas, setVendas] = useState([])
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [ps, vs, ds] = await Promise.all([
        getDocs(collection(db, 'produtos')),
        getDocs(query(collection(db, 'vendas'), orderBy('data', 'desc'))),
        isAdmin ? getDocs(query(collection(db, 'despesas'), orderBy('data', 'desc'))) : Promise.resolve({ docs: [] }),
      ])
      setProdutos(ps.docs.map(d => ({ id: d.id, ...d.data() })))
      setVendas(vs.docs.map(d => ({ id: d.id, ...d.data() })))
      setDespesas(ds.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [isAdmin])

  if (loading) return <div className="spinner" />

  const totalReceita = vendas.reduce((s, v) => s + v.total, 0)
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0)
  const custoProd = vendas.reduce((s, v) => {
    const p = produtos.find(x => x.id === v.prodId)
    return s + (p ? p.precoCompra * v.qtd : 0)
  }, 0)
  const lucro = totalReceita - totalDespesas - custoProd
  const alertas = produtos.filter(p => p.stockActual <= p.stockMinimo)

  // vendas por dia (últimos 7 dias)
  const hoje = new Date()
  const spark = Array.from({length:7},(_,i)=>{
    const d = new Date(hoje); d.setDate(hoje.getDate() - (6-i))
    const ds2 = d.toISOString().slice(0,10)
    return vendas.filter(v=>v.data===ds2).reduce((s,v)=>s+v.total,0)
  })

  // top produtos
  const map = {}
  vendas.forEach(v => { map[v.prodNome] = (map[v.prodNome]||0) + v.total })
  const topProd = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6)
  const maxTop = topProd[0]?.[1] || 1

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Bem-vindo, {isAdmin ? 'Guido' : 'Trabalhador'} · {new Date().toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stat-grid">
        <div className="stat-card" style={{'--card-color':'var(--accent)','--card-bg':'rgba(14,165,233,.1)'}}>
          <div className="icon">📦</div>
          <div className="stat-label">Produtos</div>
          <div className="stat-value" style={{color:'var(--accent)'}}>{produtos.length}</div>
          <div className="stat-sub">{alertas.length} em alerta</div>
        </div>
        <div className="stat-card" style={{'--card-color':'var(--green)','--card-bg':'rgba(16,185,129,.1)'}}>
          <div className="icon">💰</div>
          <div className="stat-label">Receita Total</div>
          <div className="stat-value" style={{color:'var(--green2)',fontSize:18}}>{fmt(totalReceita)}</div>
          <div className="stat-sub">Meticais</div>
        </div>
        {isAdmin && <>
          <div className="stat-card" style={{'--card-color':'var(--red)','--card-bg':'rgba(239,68,68,.1)'}}>
            <div className="icon">📉</div>
            <div className="stat-label">Despesas</div>
            <div className="stat-value" style={{color:'var(--red2)',fontSize:18}}>{fmt(totalDespesas)}</div>
            <div className="stat-sub">Meticais</div>
          </div>
          <div className="stat-card" style={{'--card-color':lucro>=0?'var(--amber)':'var(--red)','--card-bg':lucro>=0?'rgba(245,158,11,.1)':'rgba(239,68,68,.1)'}}>
            <div className="icon">{lucro >= 0 ? '📈' : '📉'}</div>
            <div className="stat-label">Lucro Líquido</div>
            <div className="stat-value" style={{color:lucro>=0?'var(--amber2)':'var(--red2)',fontSize:18}}>{fmt(lucro)}</div>
            <div className="stat-sub">Meticais</div>
          </div>
        </>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:16,marginBottom:16}}>
        {/* Gráfico vendas 7 dias */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Vendas — Últimos 7 dias</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>Total: {fmt(spark.reduce((a,b)=>a+b,0))} MT</div>
          </div>
          <div className="card-body">
            {spark.every(v=>v===0)
              ? <div className="empty"><div className="empty-icon">📊</div><div className="empty-sub">Sem vendas nos últimos 7 dias</div></div>
              : <div style={{display:'flex',alignItems:'flex-end',gap:6,height:80}}>
                  {spark.map((v,i)=>{
                    const max=Math.max(...spark,1)
                    const dias=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
                    const d=new Date(); d.setDate(d.getDate()-(6-i))
                    return (
                      <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <div style={{
                          width:'100%', borderRadius:'6px 6px 0 0',
                          height:`${Math.max((v/max)*60,4)}px`,
                          background:v>0?'linear-gradient(180deg,var(--accent),var(--purple))':'var(--surface2)',
                          transition:'height .5s'
                        }}/>
                        <div style={{fontSize:10,color:'var(--muted)'}}>{dias[d.getDay()]}</div>
                        {v>0 && <div style={{fontSize:9,color:'var(--accent)',fontWeight:600}}>{fmt(v).split(',')[0]}</div>}
                      </div>
                    )
                  })}
                </div>
            }
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* Top produtos */}
        {isAdmin && (
          <div className="card">
            <div className="card-header"><div className="card-title">🏆 Top Produtos</div></div>
            <div className="chart-wrap">
              {topProd.length===0
                ? <div className="empty"><div className="empty-sub">Sem dados</div></div>
                : topProd.map(([nome,val],i)=>(
                  <div className="bar-row" key={nome}>
                    <div className="bar-label" title={nome}>{nome.length>10?nome.slice(0,10)+'…':nome}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{width:`${(val/maxTop*100).toFixed(1)}%`,background:COLORS[i%COLORS.length]}}>
                        {(val/maxTop*100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="bar-val">{fmt(val)} MT</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Alertas */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠️ Stock em Alerta</div>
            <span className="badge badge-low">{alertas.length}</span>
          </div>
          {alertas.length===0
            ? <div className="empty"><div className="empty-icon">✅</div><div className="empty-sub">Tudo em ordem!</div></div>
            : <div>
                {alertas.map(p=>(
                  <div key={p.id} className="move-item">
                    <div className={`move-dot ${p.stockActual<=0?'out':'in'}`}/>
                    <div className="move-body">
                      <div className="move-title">{p.nome}</div>
                      <div className="move-meta">{p.categoria}</div>
                    </div>
                    <div>
                      {p.stockActual<=0
                        ? <span className="badge badge-out">Esgotado</span>
                        : <span className="badge badge-low">{p.stockActual} {p.unidade}</span>}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Vendas recentes */}
      <div className="card">
        <div className="card-header"><div className="card-title">🛒 Vendas Recentes</div></div>
        {vendas.length===0
          ? <div className="empty"><div className="empty-icon">🛒</div><div className="empty-sub">Sem vendas registadas</div></div>
          : <div className="table-scroll">
              <table>
                <thead><tr><th>Produto</th><th>Qtd</th><th>Total</th><th>Data</th></tr></thead>
                <tbody>
                  {vendas.slice(0,8).map(v=>(
                    <tr key={v.id}>
                      <td><strong>{v.prodNome}</strong></td>
                      <td><span className="badge badge-blue">{v.qtd}</span></td>
                      <td><span style={{color:'var(--green2)',fontWeight:700,fontFamily:'Space Grotesk'}}>{fmt(v.total)} MT</span></td>
                      <td><span style={{color:'var(--muted)',fontSize:12}}>{v.data}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </>
  )
}
