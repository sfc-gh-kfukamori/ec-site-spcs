import { useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import AdminProducts from './pages/AdminProducts'
import AdminOrders from './pages/AdminOrders'
import AdminDashboard from './pages/AdminDashboard'

export type User = {
  USER_ID: number
  USERNAME: string
  FULL_NAME: string
  EMAIL: string
  IS_ADMIN: boolean
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  const logout = () => {
    setUser(null)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-wide">Virtual EC Shop</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="hover:text-indigo-200">商品一覧</Link>
            {user ? (
              <>
                <Link to="/cart" className="hover:text-indigo-200">カート</Link>
                <Link to="/orders" className="hover:text-indigo-200">注文履歴</Link>
                {user.IS_ADMIN && (
                  <>
                    <Link to="/admin/products" className="hover:text-indigo-200">[管理]商品</Link>
                    <Link to="/admin/orders" className="hover:text-indigo-200">[管理]注文</Link>
                    <Link to="/admin/dashboard" className="hover:text-indigo-200">[管理]売上</Link>
                  </>
                )}
                <span className="text-indigo-200">{user.FULL_NAME}</span>
                <button onClick={logout} className="bg-indigo-500 px-3 py-1 rounded hover:bg-indigo-400">
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-indigo-200">ログイン</Link>
                <Link to="/register" className="hover:text-indigo-200">新規登録</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/register" element={<Register onLogin={setUser} />} />
          <Route path="/cart" element={<Cart user={user} />} />
          <Route path="/orders" element={<Orders user={user} />} />
          <Route path="/admin/products" element={<AdminProducts user={user} />} />
          <Route path="/admin/orders" element={<AdminOrders user={user} />} />
          <Route path="/admin/dashboard" element={<AdminDashboard user={user} />} />
        </Routes>
      </main>
    </div>
  )
}
