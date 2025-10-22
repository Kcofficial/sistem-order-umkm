'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  QrCode, 
  DollarSign, 
  CheckCircle, 
  ArrowLeft,
  Smartphone,
  CreditCard
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
}

interface PaymentPageProps {
  order: Order
  onBack: () => void
  onPaymentComplete: () => void
}

export default function PaymentPage({ order, onBack, onPaymentComplete }: PaymentPageProps) {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'QRIS'>('CASH')
  const [showQRCode, setShowQRCode] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)

  // --- KODE PERBAIKAN UTAMA: Proteksi data order ---
  if (!order || !order.queueNumber) {
    // Mengembalikan pesan loading yang aman jika order undefined saat prerender.
    // Ini menghentikan Next.js mencoba membaca 'queueNumber' dari objek yang tidak ada.
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <p className="text-gray-500">Memuat data pesanan...</p>
      </div>
    );
  }
  // ----------------------------------------------------

  const generateQRCode = () => {
    // Generate QR code data for QRIS payment
    const qrData = {
      merchantName: 'UMKM Kuliner',
      amount: order.totalAmount,
      orderId: order.id,
      queueNumber: order.queueNumber,
      timestamp: new Date().toISOString()
    }
    
    // In a real implementation, this would generate a proper QRIS QR code
    // For now, we'll simulate with a placeholder
    return btoa(JSON.stringify(qrData))
  }

  const handleQRISPayment = async () => {
    setShowQRCode(true)
    
    // Simulate QRIS payment processing
    setTimeout(async () => {
      setPaymentProcessing(true)
      try {
        // Update payment status
        const response = await fetch(`/api/orders/${order.id}/payment`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            paymentMethod: 'QRIS',
            paymentStatus: 'PAID'
          }),
        })

        if (response.ok) {
          toast.success('Pembayaran QRIS berhasil!')
          setTimeout(() => {
            onPaymentComplete()
          }, 2000)
        } else {
          throw new Error('Payment failed')
        }
      } catch (error) {
        console.error('Error processing QRIS payment:', error)
        toast.error('Gagal memproses pembayaran QRIS')
      } finally {
        setPaymentProcessing(false)
      }
    }, 5000) // Simulate 5 second payment process
  }

  const handleCashPayment = async () => {
    setPaymentProcessing(true)
    try {
      // Update payment status
      const response = await fetch(`/api/orders/${order.id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          paymentMethod: 'CASH',
          paymentStatus: 'PAID'
        }),
      })

      if (response.ok) {
        toast.success('Pembayaran tunai berhasil!')
        setTimeout(() => {
          onPaymentComplete()
        }, 2000)
      } else {
        throw new Error('Payment failed')
      }
    } catch (error) {
      console.error('Error processing cash payment:', error)
      toast.error('Gagal memproses pembayaran tunai')
    } finally {
      setPaymentProcessing(false)
    }
  }

  if (showQRCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-blue-600">Pembayaran QRIS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Nomor Antrian</p>
                <p className="text-xl font-bold text-orange-600">{order.queueNumber}</p>
              </div>

              <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300">
                <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">QR Code</p>
                    <p className="text-xs text-gray-400">Simulation</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Total Pembayaran</p>
                <p className="text-3xl font-bold text-blue-600">Rp {order.totalAmount.toLocaleString('id-ID')}</p>
              </div>

              {paymentProcessing && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Memproses pembayaran...</p>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Cara Pembayaran:</p>
                    <ol className="list-decimal list-inside space-y-1 mt-2">
                      <li>Buka aplikasi e-wallet (GoPay, OVO, Dana, dll)</li>
                      <li>Scan QR code di atas</li>
                      <li>Konfirmasi pembayaran</li>
                      <li>Tunggu hingga pembayaran berhasil</li>
                    </ol>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setShowQRCode(false)}
                variant="outline"
                className="w-full"
                disabled={paymentProcessing}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Nomor Antrian</p>
              <p className="text-xl font-bold text-orange-600">{order.queueNumber}</p>
            </div>

            <Separator />

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Total Pembayaran</p>
              <p className="text-3xl font-bold text-green-600">Rp {order.totalAmount.toLocaleString('id-ID')}</p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Pilih Metode Pembayaran:</h3>
              
              <div className="grid gap-3">
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedMethod === 'CASH' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedMethod('CASH')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Tunai</p>
                          <p className="text-sm text-gray-600">Bayar di kasir</p>
                        </div>
                      </div>
                      {selectedMethod === 'CASH' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedMethod === 'QRIS' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedMethod('QRIS')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">QRIS</p>
                          <p className="text-sm text-gray-600">Scan & Bayar</p>
                        </div>
                      </div>
                      {selectedMethod === 'QRIS' && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => {
                  if (selectedMethod === 'QRIS') {
                    handleQRISPayment()
                  } else {
                    handleCashPayment()
                  }
                }}
                disabled={paymentProcessing}
                className="w-full py-3 text-lg"
                size="lg"
              >
                {paymentProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </>
                ) : (
                  <>
                    {selectedMethod === 'QRIS' ? (
                      <>
                        <QrCode className="w-5 h-5 mr-2" />
                        Bayar dengan QRIS
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-5 h-5 mr-2" />
                        Bayar Tunai
                      </>
                    )}
                  </>
                )}
              </Button>

              <Button 
                onClick={onBack}
                variant="outline"
                className="w-full"
                disabled={paymentProcessing}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <CreditCard className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Informasi Pembayaran:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Pembayaran tunai: Silakan ke kasir setelah pesanan selesai</li>
                    <li>Pembayaran QRIS: Scan dan bayar sekarang</li>
                    <li>Simpan bukti pembayaran untuk verifikasi</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
