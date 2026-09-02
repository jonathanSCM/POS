"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import Decimal from "decimal.js"
import { randomUUID } from "crypto"
import { getActiveBranchId } from "@/lib/branch-context"
import { getNotificationSettings } from "@/lib/notifications/settings"
import {
  notifyLowStock,
  notifyStockOut,
  notifyBigSale,
  notifyCreditSaleRegistered,
} from "@/lib/notifications/events"

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
    customer: sale.customer
      ? { ...sale.customer, storeCreditBalance: sale.customer.storeCreditBalance?.toString() }
      : sale.customer,
    returns: (sale.returns || []).map((r: any) => ({
      ...r,
      totalRefunded: r.totalRefunded?.toString(),
      lines: (r.lines || []).map((l: any) => ({
        ...l,
        quantity: l.quantity?.toString(),
        refundAmount: l.refundAmount?.toString(),
      })),
    })),
  }
}

export async function createSale(data: {
  customerId?: string
  customerName?: string
  cashierId: string
  lines: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: string
  }>
  paymentMethod: "CASH" | "CARD" | "QR" | "TRANSFER" | "CREDIT"
  total: string
  isInvoiced?: boolean
  customerTaxId?: string
  customerBusinessName?: string
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("No autenticado")

    if (data.paymentMethod === "CREDIT" && !data.customerId) {
      throw new Error("Para vender a crédito hay que identificar al cliente")
    }

    // La sucursal siempre se resuelve del lado del servidor (nunca se
    // confía en un branchId que mande el cliente), igual que la caja
    // abierta más abajo: así toda venta queda ligada a la sucursal real en
    // la que está operando el cajero en este momento.
    const branchId = await getActiveBranchId()
    const { creditTermDays, bigSaleThreshold } = await getNotificationSettings()
    let updatedCustomerBalance: Decimal | null = null

    // Se completa durante la transacción con el stock resultante de cada
    // línea vendida, para poder chequear "stock bajo"/"agotado" después
    // (nunca dentro de la transacción -- son llamadas de red, no deben
    // demorar ni arriesgar el commit de la venta).
    const postSaleStock: Array<{
      productId: string
      productName: string
      unitType: string
      minStockAlert: Decimal
      qtyAfter: Decimal
    }> = []

    // Crear venta con transacción
    const sale = await prisma.$transaction(async (tx) => {
      // La sesión de caja abierta se resuelve siempre del lado del servidor
      // (no se confía en un registerSessionId que mande el cliente): así
      // toda venta en efectivo queda ligada a la caja real que está abierta
      // en este momento en esta sucursal, y su monto se suma al efectivo
      // esperado.
      const openSession = await tx.cashRegisterSession.findFirst({
        where: { status: "OPEN", branchId },
        orderBy: { openedAt: "desc" },
      })

      // Validar stock disponible (en la sucursal activa) y traer el precio
      // real de cada producto: el precio/total nunca se toma del cliente,
      // siempre se recalcula contra lo que realmente dice la base de datos
      // en este momento.
      const products = new Map<string, Awaited<ReturnType<typeof tx.product.findUnique>>>()
      const stocks = new Map<string, Decimal>()
      for (const line of data.lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        })
        if (!product) throw new Error(`Producto no encontrado: ${line.productId}`)
        const productStock = await tx.productStock.findUnique({
          where: { productId_branchId: { productId: line.productId, branchId } },
        })
        const stockQty = productStock ? new Decimal(productStock.qty.toString()) : new Decimal(0)
        if (stockQty.lt(line.quantity)) {
          throw new Error(
            `Stock insuficiente para ${product.name}: disponible ${stockQty}`
          )
        }
        products.set(line.productId, product)
        stocks.set(line.productId, stockQty)
      }

      const saleLines = data.lines.map((line) => {
        const product = products.get(line.productId)!
        const qty = new Decimal(line.quantity)
        const price = new Decimal(product.salePrice.toString())
        const lineTotal = qty.times(price)
        return {
          productId: line.productId,
          productName: product.name,
          quantity: qty,
          unitPrice: price,
          lineTotal,
        }
      })
      const subtotal = saleLines.reduce((sum, l) => sum.plus(l.lineTotal), new Decimal(0))
      const total = subtotal

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
          customerId: data.customerId || null,
          customerName: data.customerName || null,
          cashierId: data.cashierId,
          branchId,
          registerSessionId: openSession?.id,
          status: "COMPLETED",
          subtotal: new Prisma.Decimal(subtotal.toString()),
          discountTotal: new Prisma.Decimal(0),
          taxTotal: new Prisma.Decimal(0),
          total: new Prisma.Decimal(total.toString()),
          completedAt: new Date(),
          publicToken: randomUUID(),
          paymentStatus: data.paymentMethod === "CREDIT" ? "PENDING" : "PAID",
          creditDueDate:
            data.paymentMethod === "CREDIT"
              ? new Date(Date.now() + creditTermDays * 24 * 60 * 60 * 1000)
              : null,
          isInvoiced: Boolean(data.isInvoiced),
          invoiceNumber,
          customerTaxId: data.isInvoiced ? data.customerTaxId || null : null,
          customerBusinessName: data.isInvoiced ? data.customerBusinessName || null : null,
          lines: {
            create: saleLines.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              quantity: new Prisma.Decimal(line.quantity.toString()),
              unitPrice: new Prisma.Decimal(line.unitPrice.toString()),
              lineTotal: new Prisma.Decimal(line.lineTotal.toString()),
              lineDiscount: new Prisma.Decimal(0),
            })),
          },
          payments: {
            create: [
              {
                method: data.paymentMethod,
                amount: new Prisma.Decimal(total.toString()),
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

      // Actualizar stock (de la sucursal activa) y crear movimientos
      for (const line of data.lines) {
        const qtyBefore = stocks.get(line.productId) ?? new Decimal(0)
        const qtyAfter = qtyBefore.minus(line.quantity)

        await tx.productStock.upsert({
          where: { productId_branchId: { productId: line.productId, branchId } },
          create: {
            productId: line.productId,
            branchId,
            qty: new Prisma.Decimal(qtyAfter.toString()),
          },
          update: { qty: new Prisma.Decimal(qtyAfter.toString()) },
        })

        // Registrar movimiento de stock (negativo para salidas)
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            branchId,
            type: "SALE_OUT",
            quantity: new Prisma.Decimal(new Decimal(line.quantity).negated().toString()),
            qtyBefore: new Prisma.Decimal(qtyBefore.toString()),
            qtyAfter: new Prisma.Decimal(qtyAfter.toString()),
            userId: (session.user as any)?.id as string,
            saleId: newSale.id,
            reason: `Venta completada`,
          },
        })

        const product = products.get(line.productId)!
        postSaleStock.push({
          productId: line.productId,
          productName: product.name,
          unitType: product.unitType,
          minStockAlert: new Decimal(product.minStockAlert.toString()),
          qtyAfter,
        })
      }

      // Solo el efectivo físico afecta lo que debería haber en la caja al
      // cerrar — tarjeta/QR/transferencia no pasan por el cajón. Se suma al
      // efectivo esperado de la sesión abierta y queda un CashMovement de
      // auditoría (antes este modelo existía en el schema pero no se usaba).
      // Venta a crédito: no entra dinero, se resta del saldo de cuenta del
      // cliente (queda debiendo). No toca la caja registradora.
      if (data.paymentMethod === "CREDIT") {
        const updatedCustomer = await tx.customer.update({
          where: { id: data.customerId! },
          data: { storeCreditBalance: { decrement: new Prisma.Decimal(total.toString()) } },
        })
        updatedCustomerBalance = new Decimal(updatedCustomer.storeCreditBalance.toString())
      }

      if (openSession && data.paymentMethod === "CASH") {
        const cashAmount = new Prisma.Decimal(total.toString())

        await tx.cashRegisterSession.update({
          where: { id: openSession.id },
          data: { expectedCash: { increment: cashAmount } },
        })

        await tx.cashMovement.create({
          data: {
            sessionId: openSession.id,
            type: "SALE_CASH_IN",
            amount: cashAmount,
            note: `Venta ${saleCode}`,
            userId: (session.user as any)?.id as string,
          },
        })
      }

      return newSale
    })

    // Notificaciones: siempre después de que la venta ya se confirmó, nunca
    // dentro de la transacción -- si una falla, la venta ya quedó hecha
    // igual (ver lib/notifications/events.ts, nunca lanzan excepción).
    const branch = await prisma.branch.findUnique({ where: { id: branchId } })
    for (const stock of postSaleStock) {
      if (stock.qtyAfter.lte(0)) {
        notifyStockOut({
          productId: stock.productId,
          productName: stock.productName,
          branchId,
          branchName: branch?.name || branchId,
        })
      } else if (stock.qtyAfter.lte(stock.minStockAlert)) {
        notifyLowStock({
          productId: stock.productId,
          productName: stock.productName,
          unitType: stock.unitType,
          qty: stock.qtyAfter.toString(),
          branchId,
          branchName: branch?.name || branchId,
        })
      }
    }
    if (new Decimal(sale.total.toString()).gte(bigSaleThreshold)) {
      notifyBigSale({
        saleId: sale.id,
        total: new Decimal(sale.total.toString()).toFixed(2),
        branchName: branch?.name || branchId,
      })
    }
    if (data.paymentMethod === "CREDIT" && (sale as any).customer?.phone) {
      notifyCreditSaleRegistered({
        saleId: sale.id,
        customerPhone: (sale as any).customer.phone,
        total: new Decimal(sale.total.toString()).toFixed(2),
        balance: (updatedCustomerBalance ?? new Decimal(0)).abs().toFixed(2),
      })
    }

    return serializeSale(sale)
  } catch (error) {
    console.error("Error al crear venta:", error)
    throw error
  }
}

export async function holdSale(data: {
  customerId?: string
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

    const branchId = await getActiveBranchId()
    const saleCode = `HOLD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

    const heldSale = await prisma.sale.create({
      data: {
        code: saleCode,
        customerId: data.customerId || null,
        customerName: data.customerName || null,
        cashierId: (session.user as any)?.id as string,
        branchId,
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

    const branchId = await getActiveBranchId()
    const sales = await prisma.sale.findMany({
      where: {
        status: "HELD",
        cashierId: (session.user as any)?.id as string,
        branchId,
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
        branch: true,
        returns: { include: { lines: true } },
      },
    })
    return sale
  } catch (error) {
    console.error("Error al obtener venta:", error)
    throw error
  }
}

// Igual que getSaleById, pero con todos los Decimal convertidos a string --
// para usar en componentes cliente (ej. el dialogo de devolucion/anulacion).
export async function getSaleForActions(id: string) {
  const sale = await getSaleById(id)
  if (!sale) return null
  return serializeSale(sale)
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
