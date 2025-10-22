'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface Order {
  id: string
  queueNumber: string
  customerName?: string
  totalAmount: number
  status: string
  paymentMethod?: string
  paymentStatus: string
  notes?: string
  createdAt: string
  orderItems: {
    id: string
    quantity: number
    price: number
    notes?: string
    menuItem: {
      name: string
      category: string
    }
  }[]
}

interface SalesStats {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  totalCustomers: number
  paymentMethods: {
    CASH: number
    QRIS: number
  }
  categorySales: Record<string, number>
  hourlySales: Record<string, number>
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<SalesStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    paymentMethods: { CASH: 0, QRIS: 0 },
    categorySales: {},
    hourlySales: {}
  })
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

  useEffect(() => {
    fetchOrders()
  }, [dateFilter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/orders?filter=${dateFilter}`)
      const data = await response.json()
      setOrders(data)
      calculateStats(data)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      toast.error('Gagal mengambil data laporan')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (orderData: Order[]) => {
    const completedOrders = orderData.filter(order => order.status === 'COMPLETED')
    
    const totalOrders = completedOrders.length
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const totalCustomers = new Set(completedOrders.map(order => order.customerName)).size

    const paymentMethods = completedOrders.reduce((acc, order) => {
      if (order.paymentMethod) {
        acc[order.paymentMethod as keyof typeof acc]++
      }
      return acc
    }, { CASH: 0, QRIS: 0 })

    const categorySales: Record<string, number> = {}
    completedOrders.forEach(order => {
      order.orderItems.forEach(item => {
        const category = item.menuItem.category
        categorySales[category] = (categorySales[category] || 0) + (item.price * item.quantity)
      })
    })

    const hourlySales: Record<string, number> = {}
    completedOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours()
      const hourKey = `${hour}:00`
      hourlySales[hourKey] = (hourlySales[hourKey] || 0) + order.totalAmount
    })

    setStats({
      totalOrders,
      totalRevenue,
      averageOrderValue,
      totalCustomers,
      paymentMethods,
      categorySales,
      hourlySales
    })
  }

  const exportReport = () => {
    const csvContent = [
      ['Tanggal', 'Nomor Antrian', 'Pelanggan', 'Total', 'Metode Pembayaran', 'Status'],
      ...orders.map(order => [
        new Date(order.createdAt).toLocaleString('id-ID'),
        order.queueNumber,
        order.customerName || '-',
        order.totalAmount.toString(),
        order.paymentMethod || '-',
        order.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-penjualan-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Laporan berhasil diunduh')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Selesai'
      case 'CANCELLED': return 'Dibatalkan'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data laporan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Laporan Penjualan</h1>
                <p className="text-gray-600">Analisis dan ringkasan bisnis Anda</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['today', 'week', 'month', 'all'] as const).map(filter => (
                  <Button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    variant={dateFilter === filter ? 'default' : 'ghost'}
                    size="sm"
                  >
                    {filter === 'today' ? 'Hari Ini' : 
                     filter === 'week' ? 'Minggu' : 
                     filter === 'month' ? 'Bulan' : 'Semua'}
                  </Button>
                ))}
              </div>
              <Button onClick={exportReport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Pesanan</p>
                  <p className="text-xl font-bold">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Pendapatan</p>
                  <p className="text-xl font-bold">Rp {stats.totalRevenue.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Rata-rata</p>
                  <p className="text-xl font-bold">Rp {Math.round(stats.averageOrderValue).toLocaleString('id-ID')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Pelanggan</p>
                  <p className="text-xl font-bold">{stats.totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Payment Methods Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Metode Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tunai</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${stats.totalOrders > 0 ? (stats.paymentMethods.CASH / stats.totalOrders) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{stats.paymentMethods.CASH}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">QRIS</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${stats.totalOrders > 0 ? (stats.paymentMethods.QRIS / stats.totalOrders) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{stats.paymentMethods.QRIS}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Penjualan per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.categorySales).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <span className="text-sm font-medium">Rp {amount.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Jam Sibuk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.hourlySales)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([hour, amount]) => (
                    <div key={hour} className="flex justify-between items-center">
                      <span className="text-sm">{hour}</span>
                      <span className="text-sm font-medium">Rp {amount.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Riwayat Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Waktu</th>
                    <th className="text-left py-2 px-2">Antrian</th>
                    <th className="text-left py-2 px-2">Pelanggan</th>
                    <th className="text-left py-2 px-2">Total</th>
                    <th className="text-left py-2 px-2">Metode</th>
                    <th className="text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2 px-2 text-sm">
                        {new Date(order.createdAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2 px-2 font-medium">{order.queueNumber}</td>
                      <td className="py-2 px-2">{order.customerName || '-'}</td>
                      <td className="py-2 px-2 font-medium">Rp {order.totalAmount.toLocaleString('id-ID')}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline">
                          {order.paymentMethod === 'CASH' ? 'Tunai' : 'QRIS'}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}