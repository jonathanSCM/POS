// Corre una sola vez al arrancar el servidor (ver docs de Next.js:
// instrumentation.ts). Se usa para programar los resúmenes automáticos de
// notificaciones (diario y semanal) con node-cron -- no hay infraestructura
// de cron aparte en el despliegue (Docker standalone en Coolify), así que
// esto corre dentro del mismo proceso mientras el servidor esté vivo.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const cron = await import("node-cron")
  const { runDailyChecksIfDue, runWeeklyDigestIfDue } = await import("@/lib/notifications/scheduler")

  const TIMEZONE = "America/La_Paz"

  // Corre cada hora en punto y decide adentro si "ya toca" según la hora
  // que el admin haya configurado en Configuración (dailyCheckHour /
  // weeklyCheckHour) -- así el horario se puede cambiar desde la UI sin
  // tener que reiniciar el servidor ni tocar el cron en sí. La mayoría de
  // las notificaciones son instantáneas (se disparan al momento del
  // evento real, no por este chequeo); esto solo cubre el resumen
  // diario/cuentas vencidas y el resumen semanal.
  cron.schedule(
    "0 * * * *",
    () => {
      runDailyChecksIfDue().catch((err) => console.error("[notifications] runDailyChecksIfDue falló:", err))
      runWeeklyDigestIfDue().catch((err) => console.error("[notifications] runWeeklyDigestIfDue falló:", err))
    },
    { timezone: TIMEZONE }
  )

  console.log("[notifications] chequeo horario de resúmenes diario/semanal programado")
}
