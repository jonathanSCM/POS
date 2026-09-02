import { prisma } from "@/lib/prisma"

export async function getNotificationSettings() {
  const settings = await prisma.storeSettings.findFirst()
  return {
    notifyPhone: settings?.notifyPhone || null,
    notifyEmail: settings?.notifyEmail || null,
    bigSaleThreshold: settings?.bigSaleThreshold ? Number(settings.bigSaleThreshold) : 1000,
    bigAdjustmentThreshold: settings?.bigAdjustmentThreshold ? Number(settings.bigAdjustmentThreshold) : 20,
    creditTermDays: settings?.creditTermDays ?? 30,
    whatsappEnabled: settings?.whatsappEnabled ?? false,
    emailEnabled: settings?.emailEnabled ?? false,
    currencySymbol: settings?.currencySymbol || "$",
    storeName: settings?.storeName || "Mi Tienda",
  }
}
