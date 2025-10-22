import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'

// Function to get global socket.io instance
const getGlobalIO = () => {
  // In development, we need to access the global from the server
  if (typeof global !== 'undefined' && (global as any).socketIO) {
    return (global as any).socketIO
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queueNumber, customerName, items, totalAmount, paymentMethod } = body

    // Validate required fields
    if (!queueNumber || !customerName || !items || items.length === 0 || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create order with items
    const order = await db.order.create({
      data: {
        queueNumber,
        customerName,
        totalAmount,
        status: OrderStatus.WAITING,
        paymentMethod: paymentMethod || PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
        orderItems: {
          create: items.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes
          }))
        }
      },
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
      io.to('kitchen').emit('order-received', order)
      console.log('New order notification sent to kitchen:', order.queueNumber)
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    
    let whereClause = {}
    
    if (filter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      whereClause = {
        createdAt: {
          gte: today
        }
      }
    } else if (filter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      whereClause = {
        createdAt: {
          gte: weekAgo
        }
      }
    } else if (filter === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      whereClause = {
        createdAt: {
          gte: monthAgo
        }
      }
    }

    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}