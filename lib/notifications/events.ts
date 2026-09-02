import { getNotificationSettings } from "./settings"
import { sendWhatsAppTemplate } from "./whatsapp"
import { sendEmail } from "./email"
import { wasNotifiedToday, recordNotification } from "./log"
import { isTypeEnabled } from "./preferences"
import { renderEmailLayout } from "./email-template"

// Todas las funciones de este archivo son "seguras de disparar y olvidar":
// nunca lanzan una excepcion hacia quien las llama (createSale, voidSale,
// etc.) -- un problema de notificacion jamas debe romper una venta o un
// cierre de caja. Cada intento (exitoso o no) queda en NotificationLog.

async function viaWhatsApp(opts: {
  type: string
  to: string | null
  template: string
  params: string[]
  entityType?: string
  entityId?: string
  dedupKey?: string
}) {
  try {
    if (!opts.to) return
    if (!(await isTypeEnabled(opts.type))) return
    if (opts.dedupKey && (await wasNotifiedToday(opts.dedupKey))) return

    const { whatsappEnabled } = await getNotificationSettings()
    if (!whatsappEnabled) {
      await recordNotification({
        type: opts.type,
        channel: "WHATSAPP",
        recipient: opts.to,
        entityType: opts.entityType,
        entityId: opts.entityId,
        dedupKey: opts.dedupKey,
        status: "FAILED",
        error: "WhatsApp desactivado en Configuración (whatsappEnabled=false)",
      })
      return
    }

    const result = await sendWhatsAppTemplate(opts.to, opts.template, opts.params)
    await recordNotification({
      type: opts.type,
      channel: "WHATSAPP",
      recipient: opts.to,
      entityType: opts.entityType,
      entityId: opts.entityId,
      dedupKey: opts.dedupKey,
      status: result.success ? "SENT" : "FAILED",
      error: result.error,
    })
  } catch (err: any) {
    console.error(`[notifications] error inesperado enviando WhatsApp (${opts.type}):`, err)
  }
}

async function viaEmail(opts: {
  type: string
  to: string | null
  subject: string
  html: string
  entityType?: string
  entityId?: string
  dedupKey?: string
}) {
  try {
    if (!opts.to) return
    if (!(await isTypeEnabled(opts.type))) return
    if (opts.dedupKey && (await wasNotifiedToday(opts.dedupKey))) return

    const { emailEnabled } = await getNotificationSettings()
    if (!emailEnabled) {
      await recordNotification({
        type: opts.type,
        channel: "EMAIL",
        recipient: opts.to,
        entityType: opts.entityType,
        entityId: opts.entityId,
        dedupKey: opts.dedupKey,
        status: "FAILED",
        error: "Email desactivado en Configuración (emailEnabled=false)",
      })
      return
    }

    const result = await sendEmail({ to: opts.to, subject: opts.subject, html: opts.html })
    await recordNotification({
      type: opts.type,
      channel: "EMAIL",
      recipient: opts.to,
      entityType: opts.entityType,
      entityId: opts.entityId,
      dedupKey: opts.dedupKey,
      status: result.success ? "SENT" : "FAILED",
      error: result.error,
    })
  } catch (err: any) {
    console.error(`[notifications] error inesperado enviando email (${opts.type}):`, err)
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// ─────────────────────────────────────────────
// 1-2. Stock bajo / producto agotado
// ─────────────────────────────────────────────

export async function notifyLowStock(data: {
  productId: string
  productName: string
  unitType: string
  qty: string
  branchId: string
  branchName: string
}) {
  const { notifyPhone, notifyEmail, storeName } = await getNotificationSettings()
  const dedupKey = `LOW_STOCK:${data.productId}:${data.branchId}:${todayKey()}`
  const params = [data.qty, data.unitType, data.productName, data.branchName]

  await viaWhatsApp({
    type: "LOW_STOCK",
    to: notifyPhone,
    template: "stock_bajo",
    params,
    entityType: "Product",
    entityId: data.productId,
    dedupKey,
  })
  await viaEmail({
    type: "LOW_STOCK",
    to: notifyEmail,
    subject: `⚠️ Stock bajo: ${data.productName}`,
    html: renderEmailLayout({
      storeName,
      emoji: "📦",
      title: "Stock bajo",
      mainText: `Se recomienda reponer <b>${data.productName}</b> pronto — el stock está en o por debajo del mínimo configurado.`,
      accentColor: "#f59e0b",
      rows: [
        { label: "Producto", value: data.productName },
        { label: "Sucursal", value: data.branchName },
        { label: "Stock actual", value: `${data.qty} ${data.unitType}`, emphasize: true },
      ],
    }),
    entityType: "Product",
    entityId: data.productId,
    dedupKey,
  })
}

export async function notifyStockOut(data: {
  productId: string
  productName: string
  branchId: string
  branchName: string
}) {
  const { notifyPhone } = await getNotificationSettings()
  const dedupKey = `STOCK_OUT:${data.productId}:${data.branchId}:${todayKey()}`

  await viaWhatsApp({
    type: "STOCK_OUT",
    to: notifyPhone,
    template: "producto_agotado",
    params: [data.productName, data.branchName],
    entityType: "Product",
    entityId: data.productId,
    dedupKey,
  })
}

// ─────────────────────────────────────────────
// 3. Venta grande o inusual
// ─────────────────────────────────────────────

export async function notifyBigSale(data: { saleId: string; total: string; branchName: string }) {
  const { notifyPhone } = await getNotificationSettings()

  await viaWhatsApp({
    type: "BIG_SALE",
    to: notifyPhone,
    template: "venta_grande",
    params: [data.total, data.branchName],
    entityType: "Sale",
    entityId: data.saleId,
  })
}

// ─────────────────────────────────────────────
// 4-5. Cierre de caja / diferencia de caja
// ─────────────────────────────────────────────

export async function notifyCashClosed(data: {
  sessionId: string
  branchName: string
  totalSales: string
  cash: string
  qr: string
}) {
  const { notifyPhone, notifyEmail, storeName, currencySymbol } = await getNotificationSettings()

  await viaWhatsApp({
    type: "CASH_CLOSED",
    to: notifyPhone,
    template: "cierre_caja",
    params: [data.branchName, data.totalSales, data.cash, data.qr],
    entityType: "CashRegisterSession",
    entityId: data.sessionId,
  })
  await viaEmail({
    type: "CASH_CLOSED",
    to: notifyEmail,
    subject: `💰 Cierre de caja: ${data.branchName}`,
    html: renderEmailLayout({
      storeName,
      emoji: "💰",
      title: "Cierre de caja",
      mainText: `Se cerró la caja de <b>${data.branchName}</b>. Este es el resumen del turno:`,
      accentColor: "#16a34a",
      rows: [
        { label: "Total vendido", value: `${currencySymbol}${data.totalSales}`, emphasize: true },
        { label: "Efectivo", value: `${currencySymbol}${data.cash}` },
        { label: "QR", value: `${currencySymbol}${data.qr}` },
      ],
    }),
    entityType: "CashRegisterSession",
    entityId: data.sessionId,
  })
}

export async function notifyCashDiscrepancy(data: {
  sessionId: string
  branchName: string
  discrepancy: string
}) {
  const { notifyPhone } = await getNotificationSettings()

  await viaWhatsApp({
    type: "CASH_DISCREPANCY",
    to: notifyPhone,
    template: "diferencia_caja",
    params: [data.discrepancy, data.branchName],
    entityType: "CashRegisterSession",
    entityId: data.sessionId,
  })
}

// ─────────────────────────────────────────────
// 6-7. Cuentas por cobrar/pagar
// ─────────────────────────────────────────────

export async function notifyReceivableOverdue(data: {
  customerId: string
  customerName: string
  amount: string
  daysOverdue: number
}) {
  const { notifyPhone, notifyEmail, storeName, currencySymbol } = await getNotificationSettings()
  const dedupKey = `RECEIVABLE_OVERDUE:${data.customerId}:${todayKey()}`

  await viaWhatsApp({
    type: "RECEIVABLE_OVERDUE",
    to: notifyPhone,
    template: "cuenta_por_cobrar_vencida",
    params: [data.customerName, data.amount, String(data.daysOverdue)],
    entityType: "Customer",
    entityId: data.customerId,
    dedupKey,
  })
  await viaEmail({
    type: "RECEIVABLE_OVERDUE",
    to: notifyEmail,
    subject: `🔴 Cuenta por cobrar vencida: ${data.customerName}`,
    html: renderEmailLayout({
      storeName,
      emoji: "🔴",
      title: "Cuenta por cobrar vencida",
      mainText: `<b>${data.customerName}</b> tiene un saldo pendiente vencido. Conviene hacer seguimiento.`,
      accentColor: "#dc2626",
      rows: [
        { label: "Cliente", value: data.customerName },
        { label: "Días vencido", value: String(data.daysOverdue) },
        { label: "Monto adeudado", value: `${currencySymbol}${data.amount}`, emphasize: true },
      ],
    }),
    entityType: "Customer",
    entityId: data.customerId,
    dedupKey,
  })
}

export async function notifyPayableDue(data: {
  purchaseOrderId: string
  supplierName: string
  when: string
  amount: string
}) {
  const { notifyPhone, notifyEmail, storeName, currencySymbol } = await getNotificationSettings()
  const dedupKey = `PAYABLE_DUE:${data.purchaseOrderId}:${todayKey()}`

  await viaWhatsApp({
    type: "PAYABLE_DUE",
    to: notifyPhone,
    template: "cuenta_por_pagar_vencer",
    params: [data.supplierName, data.when, data.amount],
    entityType: "PurchaseOrder",
    entityId: data.purchaseOrderId,
    dedupKey,
  })
  await viaEmail({
    type: "PAYABLE_DUE",
    to: notifyEmail,
    subject: `🟠 Cuenta por pagar próxima a vencer: ${data.supplierName}`,
    html: renderEmailLayout({
      storeName,
      emoji: "🟠",
      title: "Cuenta por pagar próxima a vencer",
      mainText: `Tenés una factura de <b>${data.supplierName}</b> por vencer. Programá el pago para no atrasarte.`,
      accentColor: "#ea580c",
      rows: [
        { label: "Proveedor", value: data.supplierName },
        { label: "Vence", value: data.when },
        { label: "Monto", value: `${currencySymbol}${data.amount}`, emphasize: true },
      ],
    }),
    entityType: "PurchaseOrder",
    entityId: data.purchaseOrderId,
    dedupKey,
  })
}

// ─────────────────────────────────────────────
// 8. Nueva orden de compra recibida
// ─────────────────────────────────────────────

export async function notifyPurchaseOrderReceived(data: {
  purchaseOrderId: string
  supplierName: string
  totalUnits: string
}) {
  const { notifyPhone } = await getNotificationSettings()

  await viaWhatsApp({
    type: "PO_RECEIVED",
    to: notifyPhone,
    template: "oc_recibida",
    params: [data.totalUnits, data.supplierName],
    entityType: "PurchaseOrder",
    entityId: data.purchaseOrderId,
  })
}

// ─────────────────────────────────────────────
// 9-10. Pedidos por WhatsApp
// ─────────────────────────────────────────────

export async function notifyNewWhatsAppOrder(data: { orderId: string; code: string; total: string }) {
  const { notifyPhone } = await getNotificationSettings()

  await viaWhatsApp({
    type: "NEW_WA_ORDER",
    to: notifyPhone,
    template: "nuevo_pedido_whatsapp",
    params: [data.code, data.total],
    entityType: "WhatsAppOrder",
    entityId: data.orderId,
  })
}

const ORDER_STATUS_TEMPLATE: Record<string, string> = {
  CONFIRMADO: "pedido_confirmado",
  ENTREGADO: "pedido_entregado",
}

// "Listo para recoger" no es un estado propio del modelo hoy -- se
// considera parte de CONFIRMADO. Si mas adelante se agrega un estado LISTO,
// solo hace falta sumarlo a este mapa y crear su plantilla en Meta.
export async function notifyOrderStatusChange(data: {
  orderId: string
  code: string
  status: string
  customerPhone: string
}) {
  const template = ORDER_STATUS_TEMPLATE[data.status]
  if (!template) return

  await viaWhatsApp({
    type: "ORDER_STATUS",
    to: data.customerPhone,
    template,
    params: [data.code],
    entityType: "WhatsAppOrder",
    entityId: data.orderId,
  })
}

// ─────────────────────────────────────────────
// 11-12. Venta a credito / pago recibido (al cliente)
// ─────────────────────────────────────────────

export async function notifyCreditSaleRegistered(data: {
  saleId: string
  customerPhone: string
  total: string
  balance: string
}) {
  await viaWhatsApp({
    type: "CREDIT_SALE",
    to: data.customerPhone,
    template: "venta_credito_registrada",
    params: [data.total, data.balance],
    entityType: "Sale",
    entityId: data.saleId,
  })
}

export async function notifyPaymentReceived(data: {
  paymentId: string
  customerPhone: string
  amount: string
  balance: string
}) {
  await viaWhatsApp({
    type: "PAYMENT_RECEIVED",
    to: data.customerPhone,
    template: "pago_recibido",
    params: [data.amount, data.balance],
    entityType: "CustomerPayment",
    entityId: data.paymentId,
  })
}

// ─────────────────────────────────────────────
// 13-14. Resumenes
// ─────────────────────────────────────────────

export async function notifyDailySummary(data: {
  total: string
  count: number
  avgTicket: string
}) {
  const { notifyPhone, notifyEmail, storeName, currencySymbol } = await getNotificationSettings()
  const dedupKey = `DAILY_SUMMARY:${todayKey()}`

  await viaWhatsApp({
    type: "DAILY_SUMMARY",
    to: notifyPhone,
    template: "resumen_diario",
    params: [data.total, String(data.count), data.avgTicket],
    dedupKey,
  })
  await viaEmail({
    type: "DAILY_SUMMARY",
    to: notifyEmail,
    subject: `📊 Resumen del día: ${currencySymbol}${data.total} vendidos`,
    html: renderEmailLayout({
      storeName,
      emoji: "📊",
      title: "Resumen del día",
      mainText: `Así te fue hoy:`,
      rows: [
        { label: "Total vendido", value: `${currencySymbol}${data.total}`, emphasize: true },
        { label: "Cantidad de ventas", value: String(data.count) },
        { label: "Ticket promedio", value: `${currencySymbol}${data.avgTicket}` },
      ],
    }),
    dedupKey,
  })
}

export async function notifyWeeklySummary(html: string) {
  const { notifyEmail } = await getNotificationSettings()
  const dedupKey = `WEEKLY_SUMMARY:${todayKey()}`

  await viaEmail({
    type: "WEEKLY_SUMMARY",
    to: notifyEmail,
    subject: "Resumen semanal del negocio",
    html,
    dedupKey,
  })
}

// ─────────────────────────────────────────────
// 15-16. Actividad sospechosa / ajuste fuerte de inventario
// ─────────────────────────────────────────────

export async function notifySaleVoided(data: { saleId: string; total: string; userName: string }) {
  const { notifyPhone } = await getNotificationSettings()

  await viaWhatsApp({
    type: "SUSPICIOUS_ACTIVITY",
    to: notifyPhone,
    template: "actividad_sospechosa",
    params: [data.total, data.userName],
    entityType: "Sale",
    entityId: data.saleId,
  })
}

export async function notifyBigStockAdjustment(data: {
  movementId: string
  productName: string
  branchName: string
  quantity: string
}) {
  const { notifyPhone } = await getNotificationSettings()

  await viaWhatsApp({
    type: "BIG_ADJUSTMENT",
    to: notifyPhone,
    template: "ajuste_inventario",
    params: [data.quantity, data.productName, data.branchName],
    entityType: "StockMovement",
    entityId: data.movementId,
  })
}
