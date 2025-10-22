'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  ChefHat, 
  CheckCircle, 
  AlertCircle, 
  Kitchen,
  DollarSign,
  ShoppingCart,
  Bell
} from 'lucide-react'
import { toast } from 'sonner'
import { useSocket } from '@/hooks/useSocket'

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

export default function KDSPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    waitingOrders: 0,
    preparingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  })
  
  const { socket, connected, joinKitchen, notifyStatusUpdate } = useSocket()

  useEffect(() => {
    fetchOrders()
    // Set up polling for real-time updates (fallback)
    const interval = setInterval(fetchOrders, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Join kitchen room when connected
  useEffect(() => {
    if (connected) {
      joinKitchen()
    }
  }, [connected, joinKitchen])

  // Listen for new orders and updates
  useEffect(() => {
    if (!socket) return

    socket.on('order-received', (orderData: Order) => {
      toast.success(`Pesanan baru masuk! ${orderData.queueNumber}`)
      fetchOrders()
    })

    socket.on('order-updated', (data: { orderId: string; status: string; queueNumber: string }) => {
      fetchOrders()
    })

    return () => {
      socket.off('order-received')
      socket.off('order-updated')
    }
  }, [socket])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      setOrders(data)
      
      // Calculate stats
      const stats = {
        totalOrders: data.length,
        waitingOrders: data.filter((o: Order) => o.status === 'WAITING').length,
        preparingOrders: data.filter((o: Order) => o.status === 'PREPARING').length,
        completedOrders: data.filter((o: Order) => o.status === 'COMPLETED').length,
        totalRevenue: data
          .filter((o: Order) => o.status === 'COMPLETED')
          .reduce((sum: number, o: Order) => sum + o.totalAmount, 0)
      }
      setStats(stats)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const order = await response.json()
        
        // Notify via WebSocket
        notifyStatusUpdate({
          orderId,
          status: newStatus,
          queueNumber: order.queueNumber
        })
        
        toast.success(`Status pesanan ${order.queueNumber} berhasil diperbarui`)
        fetchOrders()
      } else {
        throw new Error('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Gagal memperbarui status pesanan')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PREPARING': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'READY': return 'bg-green-100 text-green-800 border-green-200'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'WAITING': return 'Menunggu Konfirmasi'
      case 'CONFIRMED': return 'Dikonfirmasi'
      case 'PREPARING': return 'Sedang Disiapkan'
      case 'READY': return 'Siap Diambil'
      case 'COMPLETED': return 'Selesai'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WAITING': return <Clock className="w-4 h-4" />
      case 'CONFIRMED': return <AlertCircle className="w-4 h-4" />
      case 'PREPARING': return <ChefHat className="w-4 h-4" />
      case 'READY': return <Bell className="w-4 h-4" />
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const activeOrders = orders.filter(order => 
    ['WAITING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const completedOrders = orders.filter(order => order.status === 'COMPLETED')

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Kitchen className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Kitchen Display System</h1>
                <p className="text-gray-600">Manajemen Antrian & Pesanan</p>
              </div>
            </div>
            <Button onClick={fetchOrders} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Menunggu</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.waitingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Disiapkan</p>
                  <p className="text-xl font-bold text-orange-600">{stats.preparingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Selesai</p>
                  <p className="text-xl font-bold text-green-600">{stats.completedOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Omset</p>
                  <p className="text-xl font-bold">Rp {stats.totalRevenue.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Orders */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Antrian Aktif ({activeOrders.length})
            </h2>
            <div className="space-y-4">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Tidak ada pesanan aktif</p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map(order => (
                  <Card key={order.id} className={`border-2 ${getStatusColor(order.status)}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold">{order.queueNumber}</div>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{getStatusText(order.status)}</span>
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="font-bold">Rp {order.totalAmount.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <p className="font-medium">{order.customerName}</p>
                        {order.notes && (
                          <p className="text-sm text-gray-600 mt-1">Catatan: {order.notes}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {order.orderItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{item.quantity}x</span>
                              <span className="ml-2">{item.menuItem.name}</span>
                              {item.notes && (
                                <p className="text-sm text-gray-600 ml-6">Cat: {item.notes}</p>
                              )}
                            </div>
                            <span className="text-sm">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>

                      <Separator className="mb-4" />

                      <div className="flex gap-2">
                        {order.status === 'WAITING' && (
                          <Button 
                            onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                            disabled={loading}
                            className="flex-1"
                          >
                            Konfirmasi Pesanan
                          </Button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <Button 
                            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                            disabled={loading}
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                          >
                            <ChefHat className="w-4 h-4 mr-2" />
                            Mulai Siapkan
                          </Button>
                        )}
                        {order.status === 'PREPARING' && (
                          <Button 
                            onClick={() => updateOrderStatus(order.id, 'READY')}
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Selesai/Siap Ambil
                          </Button>
                        )}
                        {order.status === 'READY' && (
                          <Button 
                            onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                            disabled={loading}
                            className="flex-1 bg-gray-600 hover:bg-gray-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Selesai
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Completed Orders */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Riwayat Pesanan ({completedOrders.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {completedOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Belum ada pesanan selesai</p>
                  </CardContent>
                </Card>
              ) : (
                completedOrders.slice(0, 10).map(order => (
                  <Card key={order.id} className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{order.queueNumber}</span>
                            <span className="text-sm text-gray-600">{order.customerName}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">Rp {order.totalAmount.toLocaleString('id-ID')}</p>
                          <Badge variant="secondary" className="text-xs">
                            {order.orderItems.length} item
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}