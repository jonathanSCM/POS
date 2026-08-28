-- AlterTable: agregar token público para el link de la factura digital (QR)
ALTER TABLE "sales" ADD COLUMN "publicToken" TEXT;

-- CreateIndex: Postgres permite múltiples NULL en una columna UNIQUE, así que
-- las ventas existentes (sin token todavía) no chocan entre sí.
CREATE UNIQUE INDEX "sales_publicToken_key" ON "sales"("publicToken");
