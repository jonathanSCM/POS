-- AlterTable: agregar NIT/documento del cliente para identificarlo y para
-- prellenar la facturacion cuando corresponda.
ALTER TABLE "customers" ADD COLUMN "taxId" TEXT;

-- CreateIndex
CREATE INDEX "customers_taxId_idx" ON "customers"("taxId");
