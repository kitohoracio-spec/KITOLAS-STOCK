import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function Utilizadores() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email: '', nome: '', role: 'worker' })
  const [saving, setSaving] = useState(false)
  const { toast, showToast } = useToast()

  const load = async () => {
    const snap = await getDocs(collection(db, 'users'))
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const changeRole = async (uid, newRole) => {
    if (uid === user.uid) { showToast('⚠️ Não pode alterar o seu próprio role'); return }
    await updateDoc(doc(db, 'users', uid), { role: newRole })
    showToast('✅ Role actualizado'); load()
  }

  const del = async (uid) => {
    if (uid === user.uid) { showToast('⚠️ Não pode eliminar a sua própria conta'); return }
    if (!confirm('Eliminar utilizador? O acesso será revogado.')) return
    await deleteDoc(doc(db, 'users', uid))
    showToast('🗑️ Utilizador removido'); load()
  }

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="page-title">👥 Utilizadores</div>

      {/* Instrução para criar utilizadores */}
      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--accent)' }}>ℹ️ Como adicionar um trabalhador:</strong><br />
          1. Vá ao <strong>Firebase Console → Authentication → Add user</strong><br />
          2. Crie o utilizador com email e palavra-passe<br />
          3. Copie o UID gerado e crie um documento em <strong>Firestore → users → [UID]</strong><br />
          4. Adicione os campos: <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>email</code>, <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>nome</code>, <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>role: "worker"</code><br />
          5. O utilizador aparecerá aqui e pode alterar o role abaixo.
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{users.length} utilizador(es)</span>
        </div>
        <table>
          <thead><tr><th>Nome</th><th>Email</th><th>Role</th><th>Acesso</th><th></th></tr></thead>
          <tbody>
            {users.length === 0
              ? <tr><td colSpan={5} className="empty">Nenhum utilizador registado</td></tr>
              : users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.nome || '—'}</strong> {u.id === user.uid && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(você)</span>}</td>
                  <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-worker'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Trabalhador'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {u.role === 'admin' ? 'Tudo' : 'Resumo + Vendas'}
                  </td>
                  <td>
                    {u.id !== user.uid && (
                      <>
                        <button
                          className={`btn btn-sm ${u.role === 'admin' ? 'btn-ghost' : 'btn-primary'}`}
                          style={{ marginRight: 4 }}
                          onClick={() => changeRole(u.id, u.role === 'admin' ? 'worker' : 'admin')}
                        >
                          {u.role === 'admin' ? '↓ Worker' : '↑ Admin'}
                        </button>
                        <button className="btn btn-red btn-sm" onClick={() => del(u.id)}>🗑️</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
