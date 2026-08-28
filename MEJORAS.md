# Ideas de mejora — comparación con proyectos POS similares en GitHub

Investigación hecha revisando proyectos open-source comparables (mismo stack o dominio: Next.js + Prisma + Postgres/SQLite, POS + inventario para negocios pequeños/medianos):

- **Tatlatat/pos-system** — POS enterprise multi-sucursal (NestJS + Next.js + Postgres + Redis)
- **seifosmaan53/pharmacy-pos** — POS de farmacia, Next.js 16 + Prisma, muy cercano a nuestro stack
- **swanjwich/sari-sari-store-management-system** — POS para tiendas de barrio, Next.js + Prisma + SQLite
- **Diana-Camz/Poncheck-Frontend** — POS con caja registradora y PWA offline

Cada punto abajo dice si ya lo verifiqué contra nuestro propio código o si es una idea nueva a evaluar.

---

## 🔴 Crítico — revisar pronto

### 1. El total de la venta se confía del cliente, no se recalcula en el servidor
**Verificado en [app/actions/sales.ts](app/actions/sales.ts):97,100,108** — `createSale` guarda `data.total` y `line.unitPrice` tal cual los manda el navegador, sin comparar contra `product.salePrice` en la base de datos.

En **pharmacy-pos**, el equivalente explícitamente "re-deriva los totales desde los precios de la propia base de datos — el total del carrito del cliente nunca se confía". Ahora mismo, alguien con las herramientas de desarrollador del navegador (o interceptando la petición) podría alterar el precio antes de completar una venta y el sistema lo registraría sin chistar.

**Sugerencia**: en `createSale`, recalcular `unitPrice`/`lineTotal`/`total` a partir de `product.salePrice` leído dentro de la misma transacción, y usar el valor del cliente solo como referencia de UI.

### 2. No hay límite de intentos de login (rate limiting)
Ya agregamos logs de intentos fallidos (útil para diagnosticar), pero nada bloquea intentos repetidos. **Tatlatat/pos-system** limita a 30 intentos/minuto: **swanjwich** a 5 intentos/15 min. Sin esto, un script podría probar contraseñas sin freno contra `admin@pos.local`.

**Sugerencia**: rate-limit simple en `authorize()` (ej. contador en memoria o tabla `LoginAttempt`, bloqueo temporal tras N fallos por email/IP).

---

## 🟡 Importante — vale la pena planear

### 3. Los lotes con fecha de vencimiento no se usan al vender (no hay FEFO)
Ya tenemos el modelo `ProductBatch` con `expiryDate` y `qtyRemaining` ([prisma/schema.prisma](prisma/schema.prisma):108-129), y una pantalla de alertas de vencimiento — pero `createSale` descuenta directo de `Product.stockQty`, sin tocar los lotes individuales.

**pharmacy-pos** resuelve esto con FEFO (*First-Expiry-First-Out*): cada venta descuenta primero del lote que vence más pronto, con la lógica aislada en una función pura y testeada (`allocateFEFO`). Si el negocio vende algo perecedero (alimentos, por ejemplo — vi "Agua Purificada" en el catálogo demo), esto importa: sin FEFO, el sistema puede seguir vendiendo del lote nuevo mientras el viejo se vence en el estante.

**Sugerencia**: si el cliente vende productos perecederos, conectar el descuento de venta a `ProductBatch` en vez de solo a `Product.stockQty`.

### 4. Reportes sin margen de ganancia
**Verificado**: `reports/page.tsx` ya calcula "top productos" (`topProducts` vía `groupBy`), pero no hay ningún cálculo de `salePrice - costPrice` en ningún reporte, a pesar de que `costPrice` ya se captura por producto.

Tanto **Tatlatat** ("profit analysis: revenue − COGS") como **swanjwich** ("profit tracking, profit margins") lo tratan como reporte central, no opcional.

**Sugerencia**: agregar tarjeta de "Ganancia del periodo" en `/reports`, usando `sum(salePrice - costPrice) × cantidad` por línea de venta.

### 5. Sesión no se puede revocar (cerrar sesión en otros dispositivos)
**Verificado en [lib/auth.ts](lib/auth.ts)**: usamos JWT de NextAuth sin ningún campo de versión. Si cambias tu contraseña o hay que sacar a alguien del sistema, cualquier sesión ya iniciada en otro dispositivo sigue funcionando hasta que expire sola.

**pharmacy-pos** usa un campo `tokenVersion` en `User`: cambiar contraseña o cerrar sesión invalida todas las sesiones activas de ese usuario del lado del servidor.

**Sugerencia**: agregar `tokenVersion: Int @default(0)` a `User`, incluirlo en el JWT, y verificarlo en el callback `session` — incrementarlo al cambiar contraseña.

### 6. Sin gráficos en Reportes/Dashboard
Todo se muestra como texto/tablas. **swanjwich** usa Chart.js para tendencia de ventas, top 10 productos, y desglose por método de pago — más fácil de leer de un vistazo que una tabla de números, especialmente en celular (que es justo el caso de uso de este proyecto, según el PDF del cliente).

**Sugerencia**: no es urgente, pero un gráfico de línea (ventas por día) y uno de dona (métodos de pago) en `/reports` mejorarían mucho la lectura rápida desde el celular.

### 7. Órdenes de compra sin flujo de aprobación
**Verificado**: nuestro `PurchaseOrderStatus` solo tiene `DRAFT → RECEIVED/CANCELLED` — cualquiera con acceso al módulo puede crear y recibir directamente. **Tatlatat** agrega un paso `create → approve/reject → receive`, separando "quien pide" de "quien autoriza el gasto".

**Sugerencia**: opcional, solo si el negocio tiene más de una persona en la cadena de compras. Para un negocio chico probablemente no hace falta.

---

## 🟢 Ideas menores / a futuro

### 8. Exportar/importar productos por CSV
Ahora mismo cada producto se crea uno por uno desde el formulario. **swanjwich** permite importar/exportar el catálogo completo en CSV — útil para cargar inventario inicial grande o migrar de otro sistema.

### 9. Soporte offline (PWA)
**Diana-Camz/Poncheck** usa IndexedDB + Service Workers para seguir vendiendo aunque se caiga el internet, sincronizando después. Dado que el POS corre en Coolify (un solo VPS) y el negocio probablemente vende desde el local con wifi no siempre estable, esto podría evitar que una caída de internet deje al cajero sin poder cobrar. Es una mejora grande de arquitectura, no algo para hacer ligero.

### 10. Tests automatizados
Ahora mismo no hay ningún test en el proyecto. **pharmacy-pos** tiene tests unitarios solo para la lógica que "si falla, corrompe plata o stock en silencio" (cálculo de dinero, asignación FEFO) — no intenta cubrir toda la UI, solo lo crítico. **Tatlatat** además corre tests de estrés con Playwright simulando checkouts concurrentes para probar que no haya stock negativo ni facturas duplicadas.

**Sugerencia**: si se sigue creciendo el proyecto, al menos un test para `createSale` (verifica que el stock baje correctamente y no se pueda vender en negativo bajo concurrencia) daría la mayor protección por el menor esfuerzo.

### 11. Historial de movimientos de caja más visible
Ya tenemos el modelo `CashMovement` (recién conectado en el commit `e9e2c71`), pero no hay una vista que liste esos movimientos individualmente — solo el resumen de apertura/cierre. **Diana-Camz** lo llama "Cash Movements Tracking" como pantalla propia. Útil para auditar de dónde salió cada entrada/salida de efectivo durante el turno, no solo el neto final.

---

## Resumen priorizado

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Recalcular precios/total en el servidor | Bajo | 🔴 Alto (seguridad/dinero) |
| 2 | Rate limiting en login | Bajo | 🔴 Alto (seguridad) |
| 5 | Revocar sesiones (tokenVersion) | Bajo | 🟡 Medio (seguridad) |
| 4 | Margen de ganancia en reportes | Bajo | 🟡 Medio (negocio) |
| 11 | Pantalla de movimientos de caja | Bajo | 🟢 Bajo-medio |
| 3 | FEFO en ventas (si aplica) | Medio | 🟡 Medio (solo si vende perecederos) |
| 6 | Gráficos en reportes | Medio | 🟢 Medio (UX) |
| 8 | Import/export CSV de productos | Medio | 🟢 Bajo |
| 10 | Tests para createSale | Medio | 🟡 Medio (a futuro) |
| 7 | Aprobación de órdenes de compra | Medio | 🟢 Bajo (opcional) |
| 9 | Soporte offline (PWA) | Alto | 🟢 Depende del negocio |
