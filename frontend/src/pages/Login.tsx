import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { User } from '../App'

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const data = await api.login(username, password)
      onLogin(data.user)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">ログイン</h1>
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">ユーザー名</label>
          <input className="w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">パスワード</label>
          <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-500">ログイン</button>
      </form>
    </div>
  )
}
