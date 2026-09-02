// Corre una sola vez al arrancar el servidor (ver docs de Next.js:
// instrumentation.ts). Se usa para programar los resúmenes automáticos de
// notificaciones (diario y semanal) con node-cron -- no hay infraestructura
// de cron aparte en el despliegue (Docker standalone en Coolify), así que
// esto corre dentro del mismo proceso mientras el servidor esté vivo.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const cron = await import("node-cron")
  const { runDailyChecks, runWeeklyDigest } = await import("@/lib/notifications/scheduler")

  const TIMEZONE = "America/La_Paz"

  // Todos los días a las 20:00 (hora Bolivia): resumen diario + cuentas
  // por cobrar vencidas + cuentas por pagar próximas a vencer.
  cron.schedule(
    "0 20 * * *",
    () => {
      runDailyChecks().catch((err) => console.error("[notifications] runDailyChecks falló:", err))
    },
    { timezone: TIMEZONE }
  )

  // Lunes a las 08:00 (hora Bolivia): resumen semanal por email.
  cron.schedule(
    "0 8 * * 1",
    () => {
      runWeeklyDigest().catch((err) => console.error("[notifications] runWeeklyDigest falló:", err))
    },
    { timezone: TIMEZONE }
  )

  console.log("[notifications] cron de resúmenes diario/semanal programado")
}
