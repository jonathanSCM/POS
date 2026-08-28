import { prisma } from "./prisma"

export async function getCurrencySymbol(): Promise<string> {
  const settings = await prisma.storeSettings.findFirst()
  return settings?.currencySymbol || "$"
}
