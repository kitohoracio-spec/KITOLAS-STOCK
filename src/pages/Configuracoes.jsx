import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '../firebase'
import { useToast } from '../hooks/useToast'

export default function Configuracoes() {
  const { user, role } = useAuth()
  const { toast, showToast } = useToast()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [loading, setLoading] = useState(false)

  const mudarSenha = async () => {
    if (!senhaAtual || !senhaNova) { showToast('⚠️ Preencha os dois campos'); return }
    if (senhaNova.length < 6) { showToast('⚠️ Senha mínima de 6 caracteres'); return }
    setLoading(true)
    try {
      const cred = EmailAuthProvider.credential(user.email, senhaAtual)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, senhaNova)
      showToast('✅ Palavra-passe alterada com sucesso')
      setSenhaAtual(''); setSenhaNova('')
    } catch(e) {
      showToast('❌ Palavra-passe actual incorrecta')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Configurações</div>
          <div className="page-sub">Gerir conta e preferências</div>
        </div>
      </div>

      {/* Perfil */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header"><div className="card-title">👤 Perfil</div></div>
        <div className="card-body">
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
            <div style={{width:64,height:64,background:'linear-gradient(135deg,var(--accent),var(--purple))',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:900,color:'#fff',fontFamily:'Space Grotesk'}}>
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:16,fontFamily:'Space Grotesk'}}>Guido Horácio</div>
              <div style={{color:'var(--muted)',fontSize:13}}>{user?.email}</div>
              <div style={{marginTop:6}}><span className={`badge ${role==='admin'?'badge-admin':'badge-worker'}`}>{role==='admin'?'⚡ Admin':'👤 Trabalhador'}</span></div>
            </div>
          </div>

          <div className="settings-label">Alterar Palavra-passe</div>
          <div className="field"><label>Palavra-passe Actual</label>
            <input type="password" placeholder="••••••••" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)}/>
          </div>
          <div className="field"><label>Nova Palavra-passe</label>
            <input type="password" placeholder="mínimo 6 caracteres" value={senhaNova} onChange={e=>setSenhaNova(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={mudarSenha} disabled={loading}>{loading?'A alterar...':'Alterar Senha'}</button>
        </div>
      </div>

      {/* Info do sistema */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header"><div className="card-title">ℹ️ Sobre o Sistema</div></div>
        <div className="card-body">
          <div className="settings-row" style={{marginBottom:6}}>
            <div><div className="settings-row-label">Sistema</div><div className="settings-row-sub">Barraca KITOLAS — Gestão de Stock</div></div>
            <span className="badge badge-ok">v2.0</span>
          </div>
          <div className="settings-row" style={{marginBottom:6}}>
            <div><div className="settings-row-label">Firebase</div><div className="settings-row-sub">kitolas--stock</div></div>
            <span className="badge badge-blue">Activo</span>
          </div>
          <div className="settings-row" style={{marginBottom:6}}>
            <div><div className="settings-row-label">Cloudinary</div><div className="settings-row-sub">dztfjib6h · pasta kitolas</div></div>
            <span className="badge badge-ok">Activo</span>
          </div>
          <div className="settings-row">
            <div><div className="settings-row-label">Localização</div><div className="settings-row-sub">Vila de Rapale, Nampula, Moçambique</div></div>
            <span className="badge badge-blue">🇲🇿 MZ</span>
          </div>
        </div>
      </div>

      {/* Atalho PWA */}
      <div className="card">
        <div className="card-header"><div className="card-title">📱 Atalho no Telemóvel</div></div>
        <div className="card-body">
          <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.8}}>
            Para adicionar o atalho com o ícone <strong>K</strong> ao ecrã inicial:<br/>
            <br/>
            <strong style={{color:'var(--accent)'}}>Chrome (Android):</strong><br/>
            1. Toque nos 3 pontos ⋮ no canto superior direito<br/>
            2. Seleccione <strong>"Adicionar ao ecrã inicial"</strong><br/>
            3. Confirme — aparecerá o ícone KITOLAS<br/>
            <br/>
            <strong style={{color:'var(--accent)'}}>Safari (iPhone):</strong><br/>
            1. Toque no ícone de partilha ⬆️<br/>
            2. Seleccione <strong>"Adicionar ao ecrã de início"</strong>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
