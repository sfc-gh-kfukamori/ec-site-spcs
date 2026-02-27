import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { User } from '../App'

type OrderItem = { NAME: string; QUANTITY: number; UNIT_PRICE: number }
type Order = {
  ORDER_ID: number; TOTAL_AMOUNT: number; STATUS: string;
  CREATED_AT: string; items: OrderItem[];
}

export default function Orders({ user }: { user: User | null }) {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    if (user) api.getOrders(user.USER_ID).then(setOrders)
  }, [user])

  if (!user) return <p className="text-gray-500">ログインしてください</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">注文履歴</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">注文履歴がありません</p>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.ORDER_ID} className="bg-white shadow rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">注文 #{o.ORDER_ID}</h3>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">{o.STATUS}</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">{o.CREATED_AT}</p>
              <ul className="text-sm space-y-1 mb-2">
                {o.items.map((it, i) => (
                  <li key={i}>- {it.NAME} x{it.QUANTITY} ({it.UNIT_PRICE.toLocaleString()} 円)</li>
                ))}
              </ul>
              <p className="font-bold text-right">{o.TOTAL_AMOUNT.toLocaleString()} 円</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
