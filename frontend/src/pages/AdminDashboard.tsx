import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { User } from '../App'

type Dashboard = {
  total_sales: number; total_orders: number; total_users: number;
  category_sales: { CATEGORY: string; SALES: number }[];
  top_products: { NAME: string; SOLD: number; REVENUE: number }[];
}

export default function AdminDashboard({ user }: { user: User | null }) {
  const [data, setData] = useState<Dashboard | null>(null)

  useEffect(() => { api.adminGetDashboard().then(setData) }, [])

  if (!user?.IS_ADMIN) return <p className="text-red-500">管理者権限が必要です</p>
  if (!data) return <p className="text-gray-500">読み込み中...</p>

  const maxSales = Math.max(...data.category_sales.map(c => c.SALES), 1)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">[管理] 売上ダッシュボード</h1>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded p-4 text-center">
          <p className="text-sm text-gray-500">総売上</p>
          <p className="text-2xl font-bold text-indigo-600">{data.total_sales.toLocaleString()} 円</p>
        </div>
        <div className="bg-white shadow rounded p-4 text-center">
          <p className="text-sm text-gray-500">総注文数</p>
          <p className="text-2xl font-bold text-indigo-600">{data.total_orders}</p>
        </div>
        <div className="bg-white shadow rounded p-4 text-center">
          <p className="text-sm text-gray-500">会員数</p>
          <p className="text-2xl font-bold text-indigo-600">{data.total_users}</p>
        </div>
      </div>

      {/* Category sales bar chart */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">カテゴリ別売上</h2>
        <div className="space-y-2">
          {data.category_sales.map(c => (
            <div key={c.CATEGORY} className="flex items-center gap-3">
              <span className="w-24 text-sm text-right">{c.CATEGORY}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${(c.SALES / maxSales) * 100}%` }}
                />
              </div>
              <span className="w-28 text-sm text-right">{c.SALES.toLocaleString()} 円</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-lg font-semibold mb-3">売上上位商品</h2>
        {data.top_products.length === 0 ? (
          <p className="text-gray-500">まだ売上データがありません</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">商品名</th>
                <th className="text-right p-2">販売数</th>
                <th className="text-right p-2">売上</th>
              </tr>
            </thead>
            <tbody>
              {data.top_products.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{p.NAME}</td>
                  <td className="p-2 text-right">{p.SOLD}</td>
                  <td className="p-2 text-right">{p.REVENUE.toLocaleString()} 円</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
