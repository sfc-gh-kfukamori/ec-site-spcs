import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { User } from '../App'

type Product = {
  PRODUCT_ID: number; NAME: string; DESCRIPTION: string;
  PRICE: number; STOCK: number; CATEGORY_ID: number; CATEGORY_NAME: string; IMAGE_URL: string;
}
type Category = { CATEGORY_ID: number; NAME: string }

export default function AdminProducts({ user }: { user: User | null }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [msg, setMsg] = useState('')

  // form
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState(0)
  const [stock, setStock] = useState(0)
  const [catId, setCatId] = useState(1)
  const [imageUrl, setImageUrl] = useState('')

  const load = () => {
    api.adminGetProducts().then(setProducts)
    api.getCategories().then(setCategories)
  }
  useEffect(load, [])

  if (!user?.IS_ADMIN) return <p className="text-red-500">管理者権限が必要です</p>

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.adminCreateProduct({ name, description: desc, price, stock, category_id: catId, image_url: imageUrl })
    setMsg(`「${name}」を追加しました`)
    setName(''); setDesc(''); setPrice(0); setStock(0)
    load()
    setTimeout(() => setMsg(''), 2000)
  }

  const deleteProduct = async (id: number) => {
    if (!confirm('この商品を削除しますか？')) return
    await api.adminDeleteProduct(id)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">[管理] 商品管理</h1>
      {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}

      {/* Product list */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">商品一覧</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">ID</th><th className="text-left p-2">商品名</th>
              <th className="text-left p-2">カテゴリ</th><th className="text-right p-2">価格</th>
              <th className="text-right p-2">在庫</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.PRODUCT_ID} className="border-t">
                <td className="p-2">{p.PRODUCT_ID}</td><td className="p-2">{p.NAME}</td>
                <td className="p-2">{p.CATEGORY_NAME}</td>
                <td className="p-2 text-right">{p.PRICE.toLocaleString()}</td>
                <td className="p-2 text-right">{p.STOCK}</td>
                <td className="p-2">
                  <button onClick={() => deleteProduct(p.PRODUCT_ID)} className="text-red-500 text-xs hover:underline">削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add form */}
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-lg font-semibold mb-3">商品追加</h2>
        <form onSubmit={addProduct} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">商品名</label>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">カテゴリ</label>
            <select className="w-full border rounded px-3 py-2" value={catId} onChange={e => setCatId(Number(e.target.value))}>
              {categories.map(c => <option key={c.CATEGORY_ID} value={c.CATEGORY_ID}>{c.NAME}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">価格 (円)</label>
            <input className="w-full border rounded px-3 py-2" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">在庫数</label>
            <input className="w-full border rounded px-3 py-2" type="number" value={stock} onChange={e => setStock(Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">説明</label>
            <textarea className="w-full border rounded px-3 py-2" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">画像URL</label>
            <input className="w-full border rounded px-3 py-2" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </div>
          <div className="col-span-2">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-500">追加</button>
          </div>
        </form>
      </div>
    </div>
  )
}
