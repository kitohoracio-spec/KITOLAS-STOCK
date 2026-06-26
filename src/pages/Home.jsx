import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth.jsx'
import { useNavigate } from 'react-router-dom'

const fmt = n => Number(n).toLocaleString('pt-MZ',{minimumFractionDigits:2,maximumFractionDigits:2})

export default function Home() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const isAdmin = role === 'admin'
  const [stats, setStats] = useState({ produtos:0, receita:0, despesas:0, lucro:0 })
  const [recentVendas, setRecentVendas] = useState([])
  const [loading, setLoading] = useState(true)
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = user?.email?.split('@')[0] || 'Guido'

  useEffect(() => {
    async function load() {
      const [ps, vs, ds] = await Promise.all([
        getDocs(collection(db,'produtos')),
        getDocs(query(collection(db,'vendas'),orderBy('data','desc'),limit(50))),
        isAdmin ? getDocs(collection(db,'despesas')) : Promise.resolve({docs:[]}),
      ])
      const produtos = ps.docs.map(d=>({id:d.id,...d.data()}))
      const vendas = vs.docs.map(d=>({id:d.id,...d.data()}))
      const despesas = ds.docs.map(d=>({id:d.id,...d.data()}))
      const receita = vendas.reduce((s,v)=>s+v.total,0)
      const totalDesp = despesas.reduce((s,d)=>s+d.valor,0)
      const custoProd = vendas.reduce((s,v)=>{
        const p=produtos.find(x=>x.id===v.prodId)
        return s+(p?p.precoCompra*v.qtd:0)
      },0)
      setStats({ produtos:produtos.length, receita, despesas:totalDesp, lucro:receita-totalDesp-custoProd })
      setRecentVendas(vendas.slice(0,5))
      setLoading(false)
    }
    load()
  },[isAdmin])

  const quickActions = [
    { label:'Nova Venda', icon:'🛒', path:'/vendas', color:'var(--green)', always:true },
    { label:'Ver Produtos', icon:'📦', path:'/produtos', color:'var(--accent)', admin:true },
    { label:'Registar Despesa', icon:'💸', path:'/despesas', color:'var(--red)', admin:true },
    { label:'Ver Relatório', icon:'📈', path:'/relatorio', color:'var(--purple)', admin:true },
    { label:'Movimentação', icon:'🔄', path:'/movimentacao', color:'var(--teal)', admin:true },
    { label:'Configurações', icon:'⚙️', path:'/configuracoes', color:'var(--blue)', always:true },
  ].filter(a => a.always || (a.admin && isAdmin))

  if (loading) return <div className="spinner" />

  return (
    <div>
      {/* HERO SECTION */}
      <div style={{
        background:'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)',
        border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)',
        padding:'28px 24px',
        marginBottom:20,
        position:'relative',
        overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', top:-40, right:-40,
          width:160, height:160,
          background:'radial-gradient(circle, rgba(245,166,35,.12), transparent)',
          borderRadius:'50%',
        }}/>
        <div className="hero-badge" style={{marginBottom:12}}>
          ✨ Barraca KITOLAS · Vila de Rapale
        </div>
        <h1 style={{
          fontFamily:"'Plus Jakarta Sans',sans-serif",
          fontSize:'clamp(22px,5vw,32px)',
          fontWeight:900,
          letterSpacing:'-0.5px',
          marginBottom:6,
        }}>
          {saudacao}, <span style={{color:'var(--accent)'}}>{nome}</span> 👋
        </h1>
        <p style={{color:'var(--text2)',fontSize:13,marginBottom:20}}>
          Aqui está o resumo do seu negócio hoje, {new Date().toLocaleDateString('pt-MZ',{weekday:'long',day:'numeric',month:'long'})}
        </p>

        {/* STATS */}
        <div className="stats-grid" style={{marginBottom:0}}>
          <div className="stat-card" style={{background:'var(--bg2)'}}>
            <div className="stat-icon amber">📦</div>
            <div className="stat-label">Produtos</div>
            <div className="stat-value" style={{color:'var(--accent)'}}>{stats.produtos}</div>
            <div className="stat-sub">em stock</div>
          </div>
          <div className="stat-card green" style={{background:'var(--bg2)'}}>
            <div className="stat-icon green">💰</div>
            <div className="stat-label">Receita Total</div>
            <div className="stat-value" style={{color:'var(--green)'}}>{fmt(stats.receita)}</div>
            <div className="stat-sub">Meticais</div>
          </div>
          {isAdmin && <>
            <div className="stat-card red" style={{background:'var(--bg2)'}}>
              <div className="stat-icon red">📉</div>
              <div className="stat-label">Despesas</div>
              <div className="stat-value" style={{color:'var(--red)'}}>{fmt(stats.despesas)}</div>
              <div className="stat-sub">Meticais</div>
            </div>
            <div className="stat-card teal" style={{background:'var(--bg2)'}}>
              <div className="stat-icon teal">📊</div>
              <div className="stat-label">Lucro Líquido</div>
              <div className="stat-value" style={{color:stats.lucro>=0?'var(--green)':'var(--red)'}}>{fmt(stats.lucro)}</div>
              <div className="stat-sub">Meticais</div>
            </div>
          </>}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="card mb-20">
        <div className="card-header">
          <div className="card-title">⚡ Acções Rápidas</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10}}>
          {quickActions.map(a => (
            <button key={a.path}
              onClick={() => navigate(a.path)}
              style={{
                background:'var(--surface2)',
                border:'1px solid var(--border)',
                borderRadius:'var(--radius)',
                padding:'16px 12px',
                cursor:'pointer',
                textAlign:'center',
                transition:'all .2s',
                color:'var(--text)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=a.color; e.currentTarget.style.background='var(--surface3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface2)' }}
            >
              <div style={{fontSize:28,marginBottom:8}}>{a.icon}</div>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* RECENT VENDAS */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">🛒 Últimas Vendas</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendas')}>Ver todas →</button>
        </div>
        <table>
          <thead><tr><th>Produto</th><th>Qtd</th><th>Total</th><th>Data</th></tr></thead>
          <tbody>
            {recentVendas.length===0
              ? <tr><td colSpan={4}>
                  <div className="empty">
                    <div className="empty-icon">🛒</div>
                    <div className="empty-title">Sem vendas ainda</div>
                    <div className="empty-sub">Registe a primeira venda</div>
                  </div>
                </td></tr>
              : recentVendas.map(v=>(
                <tr key={v.id}>
                  <td><strong>{v.prodNome}</strong></td>
                  <td>{v.qtd}</td>
                  <td style={{color:'var(--green)',fontWeight:600}}>{fmt(v.total)} MT</td>
                  <td style={{color:'var(--text2)',fontSize:12}}>{v.data}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
