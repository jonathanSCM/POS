"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { randomUUID } from "crypto"

// Convierte los campos Decimal de una venta (y sus líneas/pagos) a string,
// para poder devolverla desde una Server Action a un Client Component
// (Decimal no es un tipo serializable por React Server Components).
function serializeSale(sale: any) {
  return {
    ...sale,
    subtotal: sale.subtotal?.toString(),
    discountTotal: sale.discountTotal?.toString(),
    taxTotal: sale.taxTotal?.toString(),
    total: sale.total?.toString(),
    lines: (sale.lines || []).map((l: any) => ({
      ...l,
      quantity: l.quantity?.toString(),
      unitPrice: l.unitPrice?.toString(),
      lineDiscount: l.lineDiscount?.toString(),
      lineTotal: l.lineTotal?.toString(),
    })),
    payments: (sale.payments || []).map((p: any) => ({
      ...p,
      amount: p.amount?.toString(),
      amountTendered: p.amountTendered?.toString() ?? null,
      changeGiven: p.changeGiven?.toString() ?? null,
    })),
  }
}

export async function createSale(data: {
  customerName?: string
  cashierId: string
  registerSessionId?: string
  lines: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: string
  }>
  paymentMethod: "CASH" | "CARD" | "QR" | "TRANSFER"
  total: string
  isInvoiced?: boolean
  customerTaxId?: string
  customerBusinessName?: string
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("No autenticado")

    // Crear venta con transacción
    const sale = await prisma.$transaction(async (tx) => {
      // Validar stock disponible
      for (const line of data.lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        })
        if (!product) throw new Error(`Producto no encontrado: ${line.productId}`)
        if (product.stockQty.lt(line.quantity)) {
          throw new Error(
            `Stock insuficiente para ${product.name}: disponible ${product.stockQty}`
          )
        }
      }

      // Generar código único para la venta
      const saleCode = `VTA-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

      // Si la venta lleva factura, asignar el siguiente correlativo de forma atómica
      let invoiceNumber: number | null = null
      if (data.isInvoiced) {
        const result = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`
        invoiceNumber = Number(result[0].nextval)
      }

      // Crear la venta
      const newSale = await tx.sale.create({
        data: {
          code: saleCode,
          customerName: data.customerName || null,
          cashierId: data.cashierId,
          registerSessionId: data.registerSessionId,
          status: "COMPLETED",
          subtotal: new Prisma.Decimal(data.total),
          discountTotal: new Prisma.Decimal(0),
          taxTotal: new Prisma.Decimal(0),
          total: new Prisma.Decimal(data.total),
          completedAt: new Date(),
          publicToken: randomUUID(),
          isInvoiced: Boolean(data.isInvoiced),
          invoiceNumber,
          customerTaxId: data.isInvoiced ? data.customerTaxId || null : null,
          customerBusinessName: data.isInvoiced ? data.customerBusinessName || null : null,
          lines: {
            create: data.lines.map((line) => {
              const qty = new Decimal(line.quantity)
              const price = new Decimal(line.unitPrice)
              const lineTotal = qty.times(price)
              return {
                productId: line.productId,
                productName: line.productName,
                quantity: new Prisma.Decimal(qty.toString()),
                unitPrice: new Prisma.Decimal(price.toString()),
                lineTotal: new Prisma.Decimal(lineTotal.toString()),
                lineDiscount: new Prisma.Decimal(0),
              }
            }),
          },
          payments: {
            create: [
              {
                method: data.paymentMethod,
                amount: new Prisma.Decimal(data.total),
              },
            ],
          },
        },
        include: {
          lines: true,
          payments: true,
          customer: true,
        },
      })

      // Actualizar stock y crear movimientos
      for (const line of data.lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        })
        if (product) {
          const qtyBefore = product.stockQty
          const qtyAfter = qtyBefore.minus(line.quantity)

          await tx.product.update({
            where: { id: line.productId },
            data: {
              stockQty: qtyAfter,
            },
          })

          // Registrar movimiento de stock (negativo para salidas)
          await tx.stockMovement.create({
            data: {
              productId: line.productId,
              type: "SALE_OUT",
              quantity: new Prisma.Decimal(new Decimal(line.quantity).negated().toString()),
              qtyBefore: qtyBefore,
              qtyAfter: qtyAfter,
              userId: (session.user as any)?.id as string,
              saleId: newSale.id,
              reason: `Venta completada`,
            },
          })
        }
      }

      return newSale
    })

    return serializeSale(sale)
  } catch (error) {
    console.error("Error al crear venta:", error)
    throw error
  }
}

export async function holdSale(data: {
  customerName?: string
  lines: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: string
  }>
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("No autenticado")

    const saleCode = `HOLD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

    const heldSale = await prisma.sale.create({
      data: {
        code: saleCode,
        customerName: data.customerName || null,
        cashierId: (session.user as any)?.id as string,
        status: "HELD",
        subtotal: new Decimal(0),
        discountTotal: new Decimal(0),
        taxTotal: new Decimal(0),
        total: new Decimal(0),
        lines: {
          create: data.lines.map((line) => {
            const qty = new Decimal(line.quantity)
            const price = new Decimal(line.unitPrice)
            const lineTotal = qty.times(price)
            return {
              productId: line.productId,
              productName: line.productName,
              quantity: qty,
              unitPrice: price,
              lineTotal: lineTotal,
              lineDiscount: new Decimal(0),
            }
          }),
        },
      },
      include: {
        lines: true,
        customer: true,
      },
    })

    return serializeSale(heldSale)
  } catch (error) {
    console.error("Error al poner en espera venta:", error)
    throw error
  }
}

export async function getHeldSales() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("No autenticado")

    const sales = await prisma.sale.findMany({
      where: {
        status: "HELD",
        cashierId: (session.user as any)?.id as string,
      },
      include: {
        lines: true,
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return sales.map(serializeSale)
  } catch (error) {
    console.error("Error al obtener ventas en espera:", error)
    throw error
  }
}

export async function getSaleById(id: string) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        lines: true,
        payments: true,
        customer: true,
      },
    })
    return sale
  } catch (error) {
    console.error("Error al obtener venta:", error)
    throw error
  }
}

// Vista pública (sin login) de la factura digital, accedida vía QR.
// No expone nada más allá de lo que ya se imprime en el recibo físico.
export async function getSaleByPublicToken(token: string) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { publicToken: token },
      include: {
        lines: true,
        payments: true,
        customer: true,
      },
    })
    return sale
  } catch (error) {
    console.error("Error al obtener venta por token público:", error)
    throw error
  }
}

export async function cancelHeldSale(id: string) {
  try {
    await prisma.sale.delete({
      where: { id },
    })
    return { success: true }
  } catch (error) {
    console.error("Error al cancelar venta en espera:", error)
    throw error
  }
}
