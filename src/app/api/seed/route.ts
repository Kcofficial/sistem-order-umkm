import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Clear existing menu items
    await db.menuItem.deleteMany({})

    // Add sample menu items
    const menuItems = [
      {
        name: 'Nasi Goreng Spesial',
        description: 'Nasi goreng dengan telur mata sapi, ayam suwir, dan kerupuk',
        price: 28000,
        category: 'Makanan',
        available: true
      },
      {
        name: 'Mie Ayam Bakso',
        description: 'Mie ayam dengan bakso sapi dan pangsit goreng',
        price: 25000,
        category: 'Makanan',
        available: true
      },
      {
        name: 'Nasi Rames Komplit',
        description: 'Nasi dengan ayam bakar, tempe, tahu, dan sambal',
        price: 30000,
        category: 'Makanan',
        available: true
      },
      {
        name: 'Soto Ayam',
        description: 'Soto ayam dengan suwiran ayam dan telur rebus',
        price: 22000,
        category: 'Makanan',
        available: true
      },
      {
        name: 'Gado-Gado',
        description: 'Sayuran segar dengan bumbu kacang dan kerupuk',
        price: 18000,
        category: 'Makanan',
        available: true
      },
      {
        name: 'Es Teh Manis',
        description: 'Teh manis dingin segar',
        price: 5000,
        category: 'Minuman',
        available: true
      },
      {
        name: 'Es Jeruk',
        description: 'Jeruk segar dengan es batu',
        price: 8000,
        category: 'Minuman',
        available: true
      },
      {
        name: 'Kopi Hitam',
        description: 'Kopi hitam panas atau dingin',
        price: 6000,
        category: 'Minuman',
        available: true
      },
      {
        name: 'Jus Alpukat',
        description: 'Jus alpukat segar dengan susu dan madu',
        price: 15000,
        category: 'Minuman',
        available: true
      },
      {
        name: 'Teh Botol',
        description: 'Teh botol siap minum',
        price: 7000,
        category: 'Minuman',
        available: true
      },
      {
        name: 'Pisang Goreng',
        description: 'Pisang goreng crispy dengan madu',
        price: 12000,
        category: 'Cemilan',
        available: true
      },
      {
        name: 'Tahu Isi',
        description: 'Tahu goreng dengan sayuran segar',
        price: 8000,
        category: 'Cemilan',
        available: true
      },
      {
        name: 'Risol Mayo',
        description: 'Risol dengan mayones dan daging asap',
        price: 10000,
        category: 'Cemilan',
        available: true
      },
      {
        name: 'Kentang Goreng',
        description: 'Kentang goreng dengan saus sambal',
        price: 15000,
        category: 'Cemilan',
        available: true
      },
      {
        name: 'Bakwan Sayur',
        description: 'Bakwan sayuran segar',
        price: 6000,
        category: 'Cemilan',
        available: true
      }
    ]

    for (const item of menuItems) {
      await db.menuItem.create({
        data: item
      })
    }

    return NextResponse.json({ 
      message: 'Sample menu items created successfully',
      count: menuItems.length 
    })
  } catch (error) {
    console.error('Error seeding menu items:', error)
    return NextResponse.json(
      { error: 'Failed to seed menu items' },
      { status: 500 }
    )
  }
}