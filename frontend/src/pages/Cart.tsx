import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { User } from '../App'
import ProductImage from '../components/ProductImage'

type CartItem = {
  CART_ITEM_ID: number; QUANTITY: number; PRODUCT_ID: number;
  NAME: string; PRICE: number; IMAGE_URL: string; STOCK: number;
}

export default function Cart({ user }: { user: User | null }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()

  const load = () => {
    if (user) api.getCart(user.USER_ID).then(setItems)
  }
  useEffect(load, [user])

  if (!user) return <p className="text-gray-500">ログインしてください</p>

  const total = items.reduce((s, i) => s + i.PRICE * i.QUANTITY, 0)

  const updateQty = async (cartItemId: number, qty: number) => {
    await api.updateCartItem(user.USER_ID, cartItemId, qty)
    load()
  }

  const remove = async (cartItemId: number) => {
    await api.deleteCartItem(user.USER_ID, cartItemId)
    load()
  }

  const placeOrder = async () => {
    const data = await api.createOrder(user.USER_ID)
    setMsg(`注文 #${data.order_id} が確定しました!`)
    setTimeout(() => navigate('/orders'), 1500)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ショッピングカート</h1>
      {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}

      {items.length === 0 ? (
        <p className="text-gray-500">カートは空です</p>
      ) : (
        <div className="bg-white shadow rounded p-4">
          {items.map(item => (
            <div key={item.CART_ITEM_ID} className="flex items-center gap-4 py-3 border-b last:border-0">
              <ProductImage src={item.IMAGE_URL} alt={item.NAME} className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <p className="font-semibold">{item.NAME}</p>
                <p className="text-sm text-gray-500">{item.PRICE.toLocaleString()} 円</p>
              </div>
              <select
                className="border rounded px-2 py-1"
                value={item.QUANTITY}
                onChange={e => updateQty(item.CART_ITEM_ID, Number(e.target.value))}
              >
                {Array.from({ length: item.STOCK }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <p className="w-24 text-right font-semibold">{(item.PRICE * item.QUANTITY).toLocaleString()} 円</p>
              <button onClick={() => remove(item.CART_ITEM_ID)} className="text-red-500 hover:text-red-700">削除</button>
            </div>
          ))}
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <p className="text-xl font-bold">合計: {total.toLocaleString()} 円</p>
            <button onClick={placeOrder} className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-500">
              注文を確定する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
