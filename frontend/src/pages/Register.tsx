import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { User } from '../App'

export default function Register({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== password2) { setError('パスワードが一致しません'); return }
    try {
      const data = await api.register(username, password, email, fullName)
      onLogin(data.user)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">新規登録</h1>
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">ユーザー名</label>
          <input className="w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">氏名</label>
          <input className="w-full border rounded px-3 py-2" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">メールアドレス</label>
          <input className="w-full border rounded px-3 py-2" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">パスワード</label>
          <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">パスワード (確認)</label>
          <input className="w-full border rounded px-3 py-2" type="password" value={password2} onChange={e => setPassword2(e.target.value)} />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-500">登録</button>
      </form>
    </div>
  )
}
