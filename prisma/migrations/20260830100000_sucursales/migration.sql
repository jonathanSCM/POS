-- Sucursales (multi-branch): stock separado por sucursal, ventas/caja/compras
-- ligadas a una sucursal, acceso de usuarios por sucursal, y transferencias
-- de inventario entre sucursales.
--
-- Todo el backfill usa una sola sucursal "Sucursal Principal" (id fijo
-- 'br_principal') para que los datos ya existentes en la base sigan
-- funcionando exactamente igual que antes de esta migracion.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- 1. Sucursales
-- ─────────────────────────────────────────────

CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

INSERT INTO "branches" ("id", "name", "address", "active", "createdAt", "updatedAt")
VALUES ('br_principal', 'Sucursal Principal', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─────────────────────────────────────────────
-- 2. product_stocks — mover Product.stockQty aca antes de borrarlo
-- ─────────────────────────────────────────────

CREATE TABLE "product_stocks" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id")
);

INSERT INTO "product_stocks" ("id", "productId", "branchId", "qty", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'br_principal', "stockQty", CURRENT_TIMESTAMP
FROM "products";

CREATE UNIQUE INDEX "product_stocks_productId_branchId_key" ON "product_stocks"("productId", "branchId");
CREATE INDEX "product_stocks_branchId_idx" ON "product_stocks"("branchId");
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" DROP COLUMN "stockQty";

-- ─────────────────────────────────────────────
-- 3. branchId en tablas existentes: nullable -> backfill -> NOT NULL
-- ─────────────────────────────────────────────

ALTER TABLE "cash_register_sessions" ADD COLUMN "branchId" TEXT;
UPDATE "cash_register_sessions" SET "branchId" = 'br_principal';
ALTER TABLE "cash_register_sessions" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "cash_register_sessions_branchId_idx" ON "cash_register_sessions"("branchId");

DROP INDEX "product_batches_productId_batchNumber_key";
ALTER TABLE "product_batches" ADD COLUMN "branchId" TEXT;
UPDATE "product_batches" SET "branchId" = 'br_principal';
ALTER TABLE "product_batches" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "product_batches_branchId_idx" ON "product_batches"("branchId");
CREATE UNIQUE INDEX "product_batches_productId_branchId_batchNumber_key" ON "product_batches"("productId", "branchId", "batchNumber");

ALTER TABLE "purchase_orders" ADD COLUMN "branchId" TEXT;
UPDATE "purchase_orders" SET "branchId" = 'br_principal';
ALTER TABLE "purchase_orders" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales" ADD COLUMN "branchId" TEXT;
UPDATE "sales" SET "branchId" = 'br_principal';
ALTER TABLE "sales" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "sales_branchId_idx" ON "sales"("branchId");

ALTER TABLE "stock_movements" ADD COLUMN "branchId" TEXT;
UPDATE "stock_movements" SET "branchId" = 'br_principal';
ALTER TABLE "stock_movements" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "stock_movements_branchId_idx" ON "stock_movements"("branchId");

-- ─────────────────────────────────────────────
-- 4. Acceso de usuarios a sucursales
-- ─────────────────────────────────────────────

ALTER TABLE "users" ADD COLUMN "defaultBranchId" TEXT;
UPDATE "users" SET "defaultBranchId" = 'br_principal';
ALTER TABLE "users" ADD CONSTRAINT "users_defaultBranchId_fkey" FOREIGN KEY ("defaultBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "user_branches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_branches_userId_branchId_key" ON "user_branches"("userId", "branchId");
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Los ADMIN no necesitan fila aca (acceso implicito a todas las sucursales).
INSERT INTO "user_branches" ("id", "userId", "branchId", "createdAt")
SELECT gen_random_uuid()::text, "id", 'br_principal', CURRENT_TIMESTAMP
FROM "users"
WHERE "role" <> 'ADMIN';

-- ─────────────────────────────────────────────
-- 5. Transferencias de inventario entre sucursales (tablas nuevas)
-- ─────────────────────────────────────────────

CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "receivedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_transfer_lines" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "stock_transfer_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_transfers_code_key" ON "stock_transfers"("code");
CREATE INDEX "stock_transfers_fromBranchId_idx" ON "stock_transfers"("fromBranchId");
CREATE INDEX "stock_transfers_toBranchId_idx" ON "stock_transfers"("toBranchId");
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");
CREATE INDEX "stock_transfer_lines_transferId_idx" ON "stock_transfer_lines"("transferId");

ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
