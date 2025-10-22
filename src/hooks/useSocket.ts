'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io({
      transports: ['websocket', 'polling'],
    })

    socketInstance.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    socketInstance.on('connected', (data) => {
      console.log('Server message:', data.message)
    })

    socketRef.current = socketInstance
    setSocket(socketInstance)

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const joinKitchen = () => {
    if (socketRef.current) {
      socketRef.current.emit('join-kitchen')
    }
  }

  const joinCustomer = (queueNumber: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-customer', { queueNumber })
    }
  }

  const notifyNewOrder = (orderData: any) => {
    if (socketRef.current) {
      socketRef.current.emit('new-order', orderData)
    }
  }

  const notifyStatusUpdate = (data: { orderId: string; status: string; queueNumber: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('order-status-update', data)
    }
  }

  return {
    socket,
    connected,
    joinKitchen,
    joinCustomer,
    notifyNewOrder,
    notifyStatusUpdate
  }
}