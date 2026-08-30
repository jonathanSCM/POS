import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
})

export const customerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(150),
  phone: z.string().min(1, "El teléfono es requerido"),
  taxId: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
})

export const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
})

export const productSchema = z.object({
  sku: z.string().min(1, "SKU es requerido"),
  barcode: z.string().optional(),
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  costPrice: z.coerce.number().positive("Precio de costo debe ser positivo"),
  salePrice: z.coerce.number().positive("Precio de venta debe ser positivo"),
  minStockAlert: z.coerce.number().nonnegative().default(0),
  unitType: z.enum(["UNIT", "KG", "LITER", "BOX"]).default("UNIT"),
})

export const stockAdjustmentSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number(),
  reason: z.string().min(1, "Razón es requerida"),
})

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Selecciona un proveedor"),
  lines: z.array(
    z.object({
      productId: z.string().min(1, "Selecciona un producto"),
      quantity: z.coerce.number().positive(),
      unitCost: z.coerce.number().positive(),
    })
  ).min(1, "Agregar al menos un producto"),
  notes: z.string().optional(),
})
