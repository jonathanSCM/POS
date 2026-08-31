import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Limpiar datos previos
  await prisma.userBranch.deleteMany()
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
  await prisma.productStock.deleteMany()
  await prisma.product.deleteMany()
  await prisma.storeSettings.deleteMany()
  await prisma.branch.deleteMany()

  console.log('🧹 Base de datos limpiada')

  // Crear sucursal principal
  const mainBranch = await prisma.branch.create({
    data: { name: 'Sucursal Principal' },
  })
  console.log(`✅ Sucursal creada: ${mainBranch.name}`)

  // Crear admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@pos.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
      active: true,
      defaultBranchId: mainBranch.id,
    },
  })
  console.log(`✅ Admin creado: ${admin.email}`)

  // Crear test cashier
  const cashierPassword = await bcrypt.hash('cashier123', 10)
  const cashier = await prisma.user.create({
    data: {
      name: 'Cajero Test',
      email: 'cashier@pos.local',
      passwordHash: cashierPassword,
      role: 'CASHIER',
      active: true,
      defaultBranchId: mainBranch.id,
      branches: { create: [{ branchId: mainBranch.id }] },
    },
  })
  console.log(`✅ Cajero creado: ${cashier.email}`)

  // Crear categorías
  const electronics = await prisma.category.create({
    data: { name: 'Electrónica' },
  })
  const clothing = await prisma.category.create({
    data: { name: 'Ropa' },
  })
  const food = await prisma.category.create({
    data: { name: 'Alimentos' },
  })
  console.log('✅ Categorías creadas: 3')

  // Crear productos de prueba
  const products = [
    {
      sku: 'LAPTOP-001',
      barcode: '1234567890123',
      name: 'Laptop Dell XPS 13',
      description: 'Laptop de 13 pulgadas',
      categoryId: electronics.id,
      costPrice: 600,
      salePrice: 999,
      stockQty: 5,
      minStockAlert: 1,
    },
    {
      sku: 'MOUSE-001',
      barcode: '1234567890124',
      name: 'Mouse Logitech MX Master',
      description: 'Mouse inalámbrico profesional',
      categoryId: electronics.id,
      costPrice: 25,
      salePrice: 49.99,
      stockQty: 20,
      minStockAlert: 5,
    },
    {
      sku: 'SHIRT-001',
      barcode: '1234567890125',
      name: 'Camiseta Azul',
      description: 'Camiseta de algodón 100%',
      categoryId: clothing.id,
      costPrice: 5,
      salePrice: 14.99,
      stockQty: 50,
      minStockAlert: 10,
    },
    {
      sku: 'WATER-001',
      barcode: '1234567890126',
      name: 'Agua Purificada 1L',
      description: 'Botella de agua purificada',
      categoryId: food.id,
      costPrice: 0.4,
      salePrice: 1.5,
      stockQty: 100,
      minStockAlert: 20,
    },
  ]

  for (const { stockQty, ...product } of products) {
    const created = await prisma.product.create({
      data: {
        ...product,
        costPrice: product.costPrice.toString(),
        salePrice: product.salePrice.toString(),
        minStockAlert: product.minStockAlert.toString(),
      },
    })
    await prisma.productStock.create({
      data: { productId: created.id, branchId: mainBranch.id, qty: stockQty.toString() },
    })
  }
  console.log(`✅ Productos creados: ${products.length}`)

  // Crear StoreSettings (singleton)
  const settings = await prisma.storeSettings.create({
    data: {
      storeName: 'Mi Tienda POS',
      logoUrl: null,
      currencySymbol: '$',
      taxRatePercent: '0',
      receiptFooterText: 'Gracias por su compra',
      receiptPaperWidth: '80mm',
    },
  })
  console.log(`✅ Configuración de tienda creada`)

  console.log('\n🎉 Seed completado exitosamente')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
