import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PaymentMethod, PaymentStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { paymentMethod, paymentStatus } = await request.json()

    if (!paymentMethod || !Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    if (!paymentStatus || !Object.values(PaymentStatus).includes(paymentStatus)) {
      return NextResponse.json(
        { error: 'Invalid payment status' },
        { status: 400 }
      )
    }

    const order = await db.order.update({
      where: { id },
      data: { 
        paymentMethod,
        paymentStatus
      },
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        }
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}