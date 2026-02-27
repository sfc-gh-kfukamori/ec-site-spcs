import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { User } from '../App'

type OrderItem = { NAME: string; QUANTITY: number; UNIT_PRICE: number }
type Order = {
  ORDER_ID: number; TOTAL_AMOUNT: number; STATUS: string;
  CREATED_AT: string; FULL_NAME: string; items: OrderItem[];
}

const STATUSES = ['注文確定', '発送準備中', '発送済み', '配達完了', 'キャンセル']

export default function AdminOrders({ user }: { user: User | null }) {
  const [orders, setOrders] = useState<Order[]>([])

  const load = () => { api.adminGetOrders().then(setOrders) }
  useEffect(load, [])

  if (!user?.IS_ADMIN) return <p className="text-red-500">管理者権限が必要です</p>

  const updateStatus = async (orderId: number, status: string) => {
    await api.adminUpdateOrderStatus(orderId, status)
    load()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">[管理] 注文管理</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">注文がありません</p>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.ORDER_ID} className="bg-white shadow rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">注文 #{o.ORDER_ID} - {o.FULL_NAME}</h3>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={o.STATUS}
                  onChange={e => updateStatus(o.ORDER_ID, e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
