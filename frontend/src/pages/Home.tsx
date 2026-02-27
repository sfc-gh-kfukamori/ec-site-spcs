import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { User } from '../App'
import ProductImage from '../components/ProductImage'

type Product = {
  PRODUCT_ID: number; NAME: string; DESCRIPTION: string;
  PRICE: number; STOCK: number; IMAGE_URL: string; CATEGORY_NAME: string;
}
type Category = { CATEGORY_ID: number; NAME: string }

export default function Home({ user }: { user: User | null }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [keyword, setKeyword] = useState('')
  const [catId, setCatId] = useState<number | undefined>()
  const [msg, setMsg] = useState('')

  useEffect(() => { api.getCategories().then(setCategories) }, [])

  useEffect(() => {
    api.getProducts(keyword || undefined, catId).then(setProducts)
  }, [keyword, catId])

  const addToCart = async (productId: number, name: string) => {
    if (!user) return
    await api.addToCart(user.USER_ID, productId)
    setMsg(`「${name}」をカートに追加しました`)
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">商品一覧</h1>

      {msg && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>
      )}

      <div className="flex gap-4 mb-6">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="キーワード検索..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={catId ?? ''}
          onChange={e => setCatId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map(c => (
            <option key={c.CATEGORY_ID} value={c.CATEGORY_ID}>{c.NAME}</option>
          ))}
        </select>
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">該当する商品がありません</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.PRODUCT_ID} className="bg-white rounded-lg shadow p-4">
              <ProductImage src={p.IMAGE_URL} alt={p.NAME} category={p.CATEGORY_NAME} className="w-full h-48 object-cover rounded mb-3" />
              <h3 className="font-semibold text-lg">{p.NAME}</h3>
              <p className="text-sm text-gray-500 mb-1">{p.CATEGORY_NAME}</p>
              <p className="text-xl font-bold text-indigo-600 mb-1">{p.PRICE.toLocaleString()} 円</p>
              <p className="text-sm text-gray-500 mb-3">在庫: {p.STOCK}</p>
              {user && p.STOCK > 0 ? (
                <button
                  onClick={() => addToCart(p.PRODUCT_ID, p.NAME)}
                  className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-500"
                >
                  カートに追加
                </button>
              ) : !user ? (
                <p className="text-sm text-gray-400">ログインするとカートに追加できます</p>
              ) : (
                <p className="text-sm text-red-400">在庫切れ</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
