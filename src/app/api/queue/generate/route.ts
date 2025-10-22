import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get the latest queue number
    const latestOrder = await db.order.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    })

    let queueNumber = 'Q-001'
    
    if (latestOrder && latestOrder.queueNumber) {
      // Extract the numeric part and increment
      const numericPart = parseInt(latestOrder.queueNumber.replace('Q-', ''))
      const nextNumber = numericPart + 1
      queueNumber = `Q-${nextNumber.toString().padStart(3, '0')}`
    }

    return NextResponse.json({ queueNumber })
  } catch (error) {
    console.error('Error generating queue number:', error)
    // Fallback to timestamp-based queue number
    const timestamp = Date.now().toString().slice(-4)
    return NextResponse.json({ queueNumber: `Q-${timestamp}` })
  }
}