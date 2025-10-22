'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Clock, User, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'; // WAJIB: Dynamic import untuk komponen yang berat/berisiko

// Import Dynamic Payment Component (Menggantikan import statis PaymentPage)
const DynamicPaymentPage = dynamic(() => import('./payment/page'), {
  ssr: false, // JANGAN render di server
});

// Import Dynamic Socket Hook (Menggunakan dynamic import untuk hook Sisi Klien yang berpotensi gagal)
// Note: Di Next.js App Router, dynamic import hook dilakukan secara eksplisit seperti di bawah, 
// atau diasumsikan useSocket memiliki proteksi internal yang kuat.
// Karena kita tidak bisa mengubah useSocket, kita biarkan saja, namun perlu memastikan useSocket 
// memuat socket.io client dengan dynamic import.

import { useSocket } from '@/hooks/useSocket' 
// Jika useSocket menyebabkan crash, Anda harus mengubah useSocket agar me-return null 
// jika tidak dijalankan di browser, atau memuat socket client secara dinamis.

// --------------------------------------------------------------------------------------
// Interfaces (Tetap Sama)
// --------------------------------------------------------------------------------------

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  imageUrl?: string
  available: boolean
}

interface CartItem extends MenuItem {
  quantity: number
}

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
}

export default function Home() {
  const [queueNumber, setQueueNumber] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [showOrderForm, setShowOrderForm] = useState<boolean>(false)
  const [showPayment, setShowPayment] = useState<boolean>(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  
  // Memanggil useSocket (Diasumsikan useSocket dapat menangani kegagalan koneksi di Vercel)
  const { socket, connected, joinCustomer } = useSocket()

  // Generate queue number on mount
  useEffect(() => {
    generateQueueNumber()
    fetchMenuItems()
  }, [])

  // Join customer room when order is created
  useEffect(() => {
    if (currentOrder && connected) {
      joinCustomer(currentOrder.queueNumber)
    }
  }, [currentOrder, connected, joinCustomer])

  // Listen for status updates
  useEffect(() => {
    if (!socket) return

    const handleStatusUpdate = (data: { orderId: string; status: string }) => {
      if (currentOrder && currentOrder.id === data.orderId) {
        setCurrentOrder(prev => prev ? { ...prev, status: data.status } : null)
        
        const statusMessages: Record<string, string> = {
          'CONFIRMED': 'Pesanan Anda telah dikonfirmasi!',
          'PREPARING': 'Pesanan Anda sedang disiapkan...',
          'READY': 'Pesanan Anda siap diambil!',
          'COMPLETED': 'Pesanan Anda telah selesai. Terima kasih!'
        }
        
        if (statusMessages[data.status]) {
          toast.success(statusMessages[data.status])
        }
      }
    };

    socket.on('status-updated', handleStatusUpdate)

    return () => {
      socket.off('status-updated', handleStatusUpdate)
    }
  }, [socket, currentOrder])

  const generateQueueNumber = async () => {
    try {
      const response = await fetch('/api/queue/generate')
      const data = await response.json()
      setQueueNumber(data.queueNumber)
    } catch (error) {
      console.error('Failed to generate queue number:', error)
      const timestamp = Date.now().toString().slice(-4)
      setQueueNumber(`Q-${timestamp}`)
    }
  }

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu')
      const data = await response.json()
      setMenuItems(data)
    } catch (error) {
      console.error('Failed to fetch menu items:', error)
      setMenuItems([
        { id: '1', name: 'Nasi Goreng', description: 'Nasi goreng spesial dengan telur dan ayam', price: 25000, category: 'Makanan', available: true },
        { id: '2', name: 'Mie Ayam', description: 'Mie ayam dengan pangsit rebus', price: 20000, category: 'Makanan', available: true },
        { id: '3', name: 'Es Teh Manis', description: 'Teh manis dingin', price: 5000, category: 'Minuman', available: true }
      ])
    }
  }

  const startOrder = () => {
    if (!customerName.trim()) {
      toast.error('Silakan masukkan nama Anda terlebih dahulu')
      return
    }
    setShowOrderForm(true)
  }

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id)
    
    if (existingItem) {
      setCart(prev =>
        prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      )
    } else {
      setCart(prev => [...prev, { ...item, quantity: 1 }])
    }
    
    toast.success(`${item.name} ditambahkan ke keranjang`)
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      setCart(prev => prev.filter(item => item.id !== itemId))
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      )
    }
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const submitOrder = async (paymentMethod: 'CASH' | 'QRIS') => {
    if (cart.length === 0) {
      toast.error('Keranjang belanja masih kosong')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueNumber,
          customerName,
          items: cart.map(item => ({
            menuItemId: item.id,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: getTotalPrice(),
          paymentMethod
        }),
      })

      if (response.ok) {
        const order = await response.json()
        setCurrentOrder(order)
        setCart([])
        setShowOrderForm(false)
        
        // If payment method is QRIS, show payment page
        if (paymentMethod === 'QRIS') {
          setShowPayment(true)
        } else {
          toast.success('Pesanan berhasil dikirim! Silakan bayar di kasir.')
        }
      } else {
        throw new Error('Failed to submit order')
      }
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Gagal mengirim pesanan, silakan coba lagi')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentComplete = () => {
    setShowPayment(false)
    toast.success('Pembayaran berhasil! Pesanan Anda sedang diproses.')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'PREPARING': return 'bg-orange-100 text-orange-800'
      case 'READY': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'WAITING': return 'Menunggu Konfirmasi'
      case 'CONFIRMED': return 'Pesanan Dikonfirmasi'
      case 'PREPARING': return 'Sedang Disiapkan'
      case 'READY': return 'Siap Diambil'
      case 'COMPLETED': return 'Selesai'
      default: return status
    }
  }

  // --- RENDERING LOGIC ---

  if (showPayment && currentOrder) {
    // Memanggil komponen PaymentPage secara dinamis
    return (
      <DynamicPaymentPage
        order={currentOrder}
        onBack={() => setShowPayment(false)}
        onPaymentComplete={handlePaymentComplete}
      />
    )
  }

  if (currentOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">Pesanan Berhasil!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Nomor Antrian Anda</p>
                <p className="text-3xl font-bold text-orange-600">{currentOrder.queueNumber}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nama:</span>
                  <span className="font-medium">{currentOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">Rp {currentOrder.totalAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pembayaran:</span>
                  <span className="font-medium">{currentOrder.paymentMethod === 'CASH' ? 'Tunai' : 'QRIS'}</span>
                </div>
              </div>

              <Separator />

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Status Pesanan</p>
                <Badge className={getStatusColor(currentOrder.status)}>
                  {getStatusText(currentOrder.status)}
                </Badge>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Petunjuk:</p>
                    <p>1. Pantau status pesanan Anda di halaman ini</p>
                    <p>2. Pesanan akan disiapkan sesuai nomor antrian</p>
                    <p>3. Saat status "Siap Diambil", silakan ke kasir</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
                variant="outline"
              >
                Buat Pesanan Baru
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (showOrderForm) {
    const menuByCategory = menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, MenuItem[]>)

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card className="mb-6 shadow-lg">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Menu Digital</h1>
                  <p className="text-gray-600">Antrian: {queueNumber} - {customerName}</p>
                </div>
                <Button 
                  onClick={() => setShowOrderForm(false)}
                  variant="outline"
                >
                  Kembali
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Menu Items */}
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(menuByCategory).map(([category, items]) => (
                <Card key={category} className="shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <p className="text-lg font-bold text-orange-600">Rp {item.price.toLocaleString('id-ID')}</p>
                          </div>
                          <Button 
                            onClick={() => addToCart(item)}
                            disabled={!item.available}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            {item.available ? 'Pesan' : 'Habis'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cart */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Keranjang ({cart.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Keranjang kosong</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-600">Rp {item.price.toLocaleString('id-ID')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}

                      <Separator />

                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-orange-600">Rp {getTotalPrice().toLocaleString('id-ID')}</span>
                      </div>

                      <div className="space-y-2">
                        <Button 
                          onClick={() => submitOrder('CASH')}
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? 'Mengirim...' : 'Bayar Tunai'}
                        </Button>
                        <Button 
                          onClick={() => submitOrder('QRIS')}
                          disabled={loading}
                          variant="outline"
                          className="w-full"
                        >
                          {loading ? 'Mengirim...' : 'Bayar QRIS'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-10 h-10 text-orange-600" />
            </div>
            <CardTitle className="text-2xl text-gray-800">Sistem Order Digital</CardTitle>
            <p className="text-gray-600">Scan QR Code untuk memesan makanan</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Queue Number Display */}
            <div className="text-center p-6 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Nomor Antrian Anda</p>
              <p className="text-4xl font-bold text-orange-600">{queueNumber}</p>
            </div>

            {/* Customer Name Input */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nama Lengkap
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Masukkan nama Anda"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Cara Pemesanan:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Masukkan nama lengkap Anda</li>
                    <li>Klik "Mulai Pesan" untuk melihat menu</li>
                    <li>Pilih menu yang diinginkan</li>
                    <li>Pilih metode pembayaran</li>
                    <li>Pantau status pesanan Anda</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Start Order Button */}
            <Button 
              onClick={startOrder}
              className="w-full py-3 text-lg"
              size="lg"
            >
              <User className="w-5 h-5 mr-2" />
              Mulai Pesan
            </Button>

            {/* Queue Info */}
            <div className="text-center text-sm text-gray-500">
              <p>Pesanan akan diproses sesuai nomor antrian</p>
              <p>Terima kasih atas kesabaran Anda</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
