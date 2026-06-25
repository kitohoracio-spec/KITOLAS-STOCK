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

  const handleLogin = async () => {
    if (!email || !pass) { setErr('Preencha email e palavra-passe'); return }
    setLoading(true); setErr('')
    try {
      await signInWithEmailAndPassword(auth, email, pass)
      navigate('/')
    } catch (e) {
      setErr('Email ou palavra-passe incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">KITO<span>LAS</span></div>
        <div className="login-sub">Gestão de Stock · Barraca KITOLAS</div>

        {err && <div className="login-err">{err}</div>}

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div className="field">
          <label>Palavra-passe</label>
          <input
            type="password"
            placeholder="••••••••"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px' }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'A entrar...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
