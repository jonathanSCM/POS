-- AlterTable: monto total, fecha de vencimiento y estado de pago de la orden de compra
ALTER TABLE "purchase_orders" ADD COLUMN "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "purchase_orders" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- Rellenar totalAmount de las ordenes ya existentes a partir de sus lineas
UPDATE "purchase_orders" po
SET "totalAmount" = COALESCE((
  SELECT SUM(pol."quantity" * pol."unitCost")
  FROM "purchase_order_lines" pol
  WHERE pol."purchaseOrderId" = po."id"
), 0);

-- CreateTable: abonos a ordenes de compra (cuentas por pagar a proveedores)
CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_payments_purchaseOrderId_idx" ON "supplier_payments"("purchaseOrderId");

ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
