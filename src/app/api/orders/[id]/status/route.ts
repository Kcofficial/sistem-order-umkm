import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { OrderStatus } from '@prisma/client'

// Function to get global socket.io instance
const getGlobalIO = () => {
  // In development, we need to access the global from the server
  if (typeof global !== 'undefined' && (global as any).socketIO) {
    return (global as any).socketIO
  }
  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { status } = await request.json()

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const order = await db.order.update({
      where: { id },
      data: { status },
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        }
      }
    })

    // Emit WebSocket event for real-time notification
    const io = getGlobalIO()
    if (io) {
      // Notify specific customer
      io.to(`customer-${order.queueNumber}`).emit('status-updated', {
        orderId: order.id,
        status: order.status
      })
      
      // Also notify kitchen staff
      io.to('kitchen').emit('order-updated', {
        orderId: order.id,
        status: order.status,
        queueNumber: order.queueNumber
      })
      
      console.log('Order status update notification sent:', {
        orderId: order.id,
        status: order.status,
        queueNumber: order.queueNumber
      })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}