-- AlterTable: estado de pago de la venta (PAID / PENDING para ventas a credito)
ALTER TABLE "sales" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PAID';

-- CreateTable: abonos de clientes a su cuenta corriente (fiado)
CREATE TABLE "customer_payments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_payments_customerId_idx" ON "customer_payments"("customerId");

ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
