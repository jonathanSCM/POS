-- Preferencias por tipo de notificacion + hora configurable de los
-- chequeos periodicos (resumen diario/semanal). Todo con default, sin
-- backfill necesario.

ALTER TABLE "store_settings" ADD COLUMN     "dailyCheckHour" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "weeklyCheckHour" INTEGER NOT NULL DEFAULT 8;

CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_type_key" ON "notification_preferences"("type");
