import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const doLogin = async () => {
    if (!email || !pass) { setErr('Preencha email e palavra-passe'); return }
    setLoading(true); setErr('')
    try {
      await signInWithEmailAndPassword(auth, email, pass)
      navigate('/')
    } catch {
      setErr('Email ou palavra-passe incorrectos')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-k">K</div>
          <div className="login-brand">KITO<span>LAS</span></div>
          <div className="login-sub">Gestão de Stock · Barraca KITOLAS</div>
        </div>

        {err && <div className="login-err" style={{display:'block'}}>{err}</div>}

        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="email@exemplo.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()} />
        </div>
        <div className="field">
          <label>Palavra-passe</label>
          <input type="password" placeholder="••••••••" value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()} />
        </div>

        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px',marginTop:6,fontSize:14}}
          onClick={doLogin} disabled={loading}>
          {loading ? '⏳ A entrar...' : '→ Entrar'}
        </button>
      </div>
    </div>
  )
}
