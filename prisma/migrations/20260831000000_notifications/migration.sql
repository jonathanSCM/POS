-- Sistema de notificaciones (WhatsApp + email): configuracion en
-- store_settings, fecha limite de fiado en sales, y auditoria/dedup en
-- notification_logs. Todo nullable o con default -- no requiere backfill.

ALTER TABLE "sales" ADD COLUMN     "creditDueDate" TIMESTAMP(3);

ALTER TABLE "store_settings" ADD COLUMN     "bigAdjustmentThreshold" DECIMAL(65,30) NOT NULL DEFAULT 20,
ADD COLUMN     "bigSaleThreshold" DECIMAL(65,30) NOT NULL DEFAULT 1000,
ADD COLUMN     "creditTermDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyEmail" TEXT,
ADD COLUMN     "notifyPhone" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "dedupKey" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_logs_dedupKey_idx" ON "notification_logs"("dedupKey");
CREATE INDEX "notification_logs_createdAt_idx" ON "notification_logs"("createdAt");
