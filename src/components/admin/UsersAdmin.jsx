import { useEffect, useState, useMemo, useRef } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useTranslation } from '../../contexts/TranslationContext'
import { useEffectiveRole } from '../../utils/requireRole'
import './UsersAdmin.css'

const CLASS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב']

function norm(v) {
  return (v || '').trim()
}

function normLower(v) {
  return norm(v).toLowerCase()
}

function labelUser(u) {
  const full = `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim()
  return full || u.username || ''
}

async function sha256Hex(text) {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  const bytes = Array.from(new Uint8Array(buf))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function UsersAdmin() {
  const { t } = useTranslation()
  const { role } = useEffectiveRole()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [toast, setToast] = useState({ show: false, kind: '', message: '' })
  
  // Only admins can manage users
  const canManageUsers = role === 'admin'

  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    role: 'student',
    birthdayRaw: '',
    classId: '',
    password: '',
  })
  const [creating, setCreating] = useState(false)

  const [edit, setEdit] = useState({ open: false, row: null, birthdayRaw: '', passwordRaw: '' })
  const [saving, setSaving] = useState(false)

  // Use polling instead of real-time to reduce DB connections
  // Users list doesn't need instant updates
  const usersLoadedRef = useRef(false)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'appUsers'), orderBy('usernameLower')))
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setItems(list)
        usersLoadedRef.current = true
      } catch (err) {
        showToast('error', t('users.toasts.loadFail', { msg: err.message }) || 'Error loading users')
      }
    }
    
    loadUsers()
    // Refresh every 30 seconds instead of real-time
    const interval = setInterval(loadUsers, 30000)
    return () => clearInterval(interval)
  }, [t])

  function showToast(kind, message) {
    setToast({ show: true, kind, message })
    setTimeout(() => setToast({ show: false, kind: '', message: '' }), 2600)
  }

  const filtered = useMemo(() => {
    const s = normLower(search)
    return items.filter(u => {
      // Hide system admin user (uid === 'system-admin')
      if (u.uid === 'system-admin' || u.id === 'system-admin') return false
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (!s) return true
      const hay = `${u.username} ${u.firstName} ${u.lastName} ${u.birthday || ''}`.toLowerCase()
      return hay.includes(s)
    })
  }, [items, search, roleFilter])

  const canCreate = useMemo(
    () => !!norm(form.username) && !!norm(form.role) && !!norm(form.password),
    [form]
  )

  async function createUser(e) {
    e.preventDefault()
    if (!canCreate || creating) return

    try {
      setCreating(true)
      const username = norm(form.username)
      const usernameLower = username.toLowerCase()

      const dup = await getDocs(
        query(collection(db, 'appUsers'), where('usernameLower', '==', usernameLower))
      )
      if (!dup.empty) {
        showToast('error', t('users.toasts.dup', { username }) || `Username already exists: ${username}`)
        return
      }

      const passwordHash = await sha256Hex(norm(form.password))

      await addDoc(collection(db, 'appUsers'), {
        username,
        usernameLower,
        firstName: norm(form.firstName),
        lastName: norm(form.lastName),
        role: form.role,
        birthday: form.birthdayRaw,
        classId: form.classId,
        passwordHash,
        createdAt: serverTimestamp(),
      })

      setForm({
        username: '',
        firstName: '',
        lastName: '',
        role: 'student',
        birthdayRaw: '',
        classId: '',
        password: '',
      })
      showToast('success', t('users.toasts.created', { username }) || `Created user: ${username}`)
    } catch (e) {
      showToast('error', t('users.toasts.createFail', { msg: e?.message || 'unknown' }) || 'Error creating user')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(row) {
    setEdit({ open: true, row, birthdayRaw: row.birthday || '', passwordRaw: '' })
  }

  function closeEdit() {
    setEdit({ open: false, row: null, birthdayRaw: '', passwordRaw: '' })
  }

  async function saveEdit() {
    if (!edit.open || saving) return
    const { row, birthdayRaw, passwordRaw } = edit

    try {
      setSaving(true)

      const username = norm(row.username || '')
      const usernameLower = username.toLowerCase()

      if (username) {
        const dup = await getDocs(
          query(collection(db, 'appUsers'), where('usernameLower', '==', usernameLower))
        )
        const existsOther = dup.docs.some(d => d.id !== row.id)
        if (existsOther) {
          showToast('error', t('users.toasts.dup', { username }) || `Username already exists: ${username}`)
          setSaving(false)
          return
        }
      }

      const payload = {
        username,
        usernameLower,
        firstName: norm(row.firstName || ''),
        lastName: norm(row.lastName || ''),
        role: row.role || 'student',
        birthday: birthdayRaw,
        classId: norm(row.classId || ''),
      }

      if (norm(passwordRaw)) {
        payload.passwordHash = await sha256Hex(norm(passwordRaw))
      }

      await updateDoc(doc(db, 'appUsers', row.id), payload)

      showToast('success', t('users.toasts.updated', { username: username || row.id }) || 'User updated')
      closeEdit()
    } catch (e) {
      showToast('error', t('users.toasts.updateFail', { msg: e?.message || 'unknown' }) || 'Error updating user')
    } finally {
      setSaving(false)
    }
  }

  async function removeUser(id) {
    if (!window.confirm('Are you sure?')) return
    try {
      await deleteDoc(doc(db, 'appUsers', id))
      showToast('success', t('users.toasts.deleted') || 'User deleted')
    } catch (e) {
      showToast('error', t('users.toasts.deleteFail', { msg: e?.message || 'unknown' }) || 'Error deleting user')
    }
  }

  if (!canManageUsers) {
    return (
      <div className="users-admin">
        <div className="users-error">
          {t('users.noPermission') || 'אין לך הרשאה לנהל משתמשים. רק מנהלים יכולים.'}
        </div>
      </div>
    )
  }

  return (
    <div className="users-admin">
      <h2>{t('users.list') || 'כל המשתמשים'}</h2>

      {/* Create form */}
      <section className="users-section">
        <h3>{t('users.new') || 'Create User'}</h3>
        <form onSubmit={createUser} className="users-form">
          <div className="users-form-grid">
            <input
              className="users-input"
              placeholder={t('users.username') || 'Username'}
              value={form.username}
              onChange={e => setForm(v => ({ ...v, username: e.target.value }))}
            />
            <input
              className="users-input"
              placeholder={t('users.firstName') || 'First name'}
              value={form.firstName}
              onChange={e => setForm(v => ({ ...v, firstName: e.target.value }))}
            />
            <input
              className="users-input"
              placeholder={t('users.lastName') || 'Last name'}
              value={form.lastName}
              onChange={e => setForm(v => ({ ...v, lastName: e.target.value }))}
            />
            <select
              className="users-select"
              value={form.role}
              onChange={e => setForm(v => ({ ...v, role: e.target.value }))}
            >
              <option value="student">{t('users.role.student') || 'תלמיד'}</option>
              <option value="parent">{t('users.role.parent') || 'הורה'}</option>
              <option value="committee">{t('users.role.committee') || 'וועד'}</option>
              <option value="editor">{t('users.role.editor') || 'עורך'}</option>
              <option value="admin">{t('users.role.admin') || 'מנהל'}</option>
            </select>
            {form.role === 'admin' && (
              <div className="users-note" style={{ gridColumn: '1 / -1', fontSize: '0.9rem', color: '#666', marginTop: '-0.5rem' }}>
                {t('users.adminNote') || 'רק מנהלים יכולים למנות מנהלים חדשים'}
              </div>
            )}
            <input
              type="date"
              className="users-input"
              placeholder={t('users.birthday') || 'Birthday'}
              value={form.birthdayRaw}
              onChange={e => setForm(v => ({ ...v, birthdayRaw: e.target.value }))}
            />
            <select
              className="users-select"
              value={form.classId}
              onChange={e => setForm(v => ({ ...v, classId: e.target.value }))}
            >
              <option value="">{t('users.classId') || 'Class ID'}</option>
              {CLASS_HE.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <input
              type="password"
              className="users-input"
              placeholder={t('users.password') || 'Password'}
              value={form.password}
              onChange={e => setForm(v => ({ ...v, password: e.target.value }))}
            />
          </div>
          <button className="btn btn-primary" disabled={!canCreate || creating}>
            {creating ? (t('common.saving') || 'Saving…') : (t('common.create') || 'Create')}
          </button>
        </form>
      </section>

      {/* Search and filter */}
      <div className="users-filters">
        <input
          className="users-input"
          placeholder={t('common.search') || 'Search'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="users-select"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">{t('users.filter.all') || 'הכל'}</option>
          <option value="student">{t('users.filter.student') || 'תלמידים'}</option>
          <option value="parent">{t('users.filter.parent') || 'הורים'}</option>
          <option value="committee">{t('users.filter.committee') || 'וועד'}</option>
          <option value="editor">{t('users.filter.editor') || 'עורכים'}</option>
          <option value="admin">{t('users.filter.admin') || 'מנהלים'}</option>
        </select>
      </div>

      {/* Users table */}
      <div className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t('users.table.username') || 'Username'}</th>
              <th>{t('users.table.name') || 'Name'}</th>
              <th>{t('users.table.role') || 'Role'}</th>
              <th>{t('users.table.birthday') || 'Birthday'}</th>
              <th>{t('users.table.classId') || 'Class'}</th>
              <th>{t('common.actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{labelUser(u)}</td>
                <td><span className="users-badge">{u.role}</span></td>
                <td>{u.birthday || '-'}</td>
                <td>{u.classId || '-'}</td>
                <td>
                  <div className="users-actions">
                    <button className="btn btn-small" onClick={() => openEdit(u)}>
                      {t('common.edit') || 'Edit'}
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => removeUser(u.id)}>
                      {t('common.delete') || 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {edit.open && (
        <div className="users-modal-backdrop" onClick={closeEdit}>
          <div className="users-modal" onClick={e => e.stopPropagation()}>
            <h3>{t('users.editTitle') || 'Edit User'}</h3>
            <div className="users-form-grid">
              <input
                className="users-input"
                placeholder={t('users.username') || 'Username'}
                value={edit.row.username || ''}
                onChange={e => setEdit(prev => ({ ...prev, row: { ...prev.row, username: e.target.value } }))}
              />
              <input
                className="users-input"
                placeholder={t('users.firstName') || 'First name'}
                value={edit.row.firstName || ''}
                onChange={e => setEdit(prev => ({ ...prev, row: { ...prev.row, firstName: e.target.value } }))}
              />
              <input
                className="users-input"
                placeholder={t('users.lastName') || 'Last name'}
                value={edit.row.lastName || ''}
                onChange={e => setEdit(prev => ({ ...prev, row: { ...prev.row, lastName: e.target.value } }))}
              />
              <select
                className="users-select"
                value={edit.row.role}
                onChange={e => setEdit(prev => ({ ...prev, row: { ...prev.row, role: e.target.value } }))}
              >
                <option value="student">{t('users.role.student') || 'תלמיד'}</option>
                <option value="parent">{t('users.role.parent') || 'הורה'}</option>
                <option value="committee">{t('users.role.committee') || 'וועד'}</option>
                <option value="editor">{t('users.role.editor') || 'עורך'}</option>
                <option value="admin">{t('users.role.admin') || 'מנהל'}</option>
              </select>
              <input
                type="date"
                className="users-input"
                placeholder={t('users.birthday') || 'Birthday'}
                value={edit.birthdayRaw}
                onChange={e => setEdit(prev => ({ ...prev, birthdayRaw: e.target.value }))}
              />
              <select
                className="users-select"
                value={edit.row.classId || ''}
                onChange={e => setEdit(prev => ({ ...prev, row: { ...prev.row, classId: e.target.value } }))}
              >
                <option value="">{t('users.classId') || 'Class ID'}</option>
                {CLASS_HE.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <input
                type="password"
                className="users-input"
                placeholder={t('users.newPassword') || 'New password (optional)'}
                value={edit.passwordRaw}
                onChange={e => setEdit(prev => ({ ...prev, passwordRaw: e.target.value }))}
              />
            </div>
            <div className="users-modal-actions">
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? (t('common.saving') || 'Saving…') : (t('common.save') || 'Save')}
              </button>
              <button className="btn btn-ghost" onClick={closeEdit}>
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`users-toast users-toast-${toast.kind}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
