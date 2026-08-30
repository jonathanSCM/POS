# Planning — Etapa 3: Clientes, Crédito, Kardex y Gestión Avanzada

Roadmap de las 14 ideas propuestas, organizadas en fases por dependencia (unas necesitan que otra exista primero) y verificadas contra el código real — cada punto dice si ya hay base construida o si es 100% nuevo.

---

## Antes de empezar: lo que ya existe y no se sabía

- **`Customer` (clientes) ya es un modelo de la base de datos** — con `name`, `phone`, `email`, `address` y hasta `storeCreditBalance` (saldo a favor/en contra) ya definido. **Pero no se usa en ningún lado**: el POS solo guarda un nombre de texto suelto en el carrito (`CustomerPicker`), nunca crea ni busca un cliente real. No tiene campo de NIT todavía.
- **`Return`/`ReturnLine` (devoluciones) ya son modelos de la base de datos**, con su relación a `StockMovement` para reponer inventario — pero **no hay ni una sola función que los use**. Es una funcionalidad modelada al 0% implementada.
- **El Kardex (punto 5) ya existe en buena parte**: `StockMovement` registra cada entrada/salida con `qtyBefore`/`qtyAfter`, ligado a venta, compra, devolución o ajuste, y ya hay una pantalla por producto (`/inventory/movements/[productId]`). Lo que falta es pulir/consolidar, no construir desde cero.
- **Costo, margen y utilidad (punto 6) ya está implementado** — se hizo en la sesión pasada: `/reports` muestra "Ganancia del Periodo" y "Margen de Ganancia %" calculados con `costPrice` real. No hay nada pendiente aquí.
- **Productos más vendidos (parte del punto 7) ya existe** en `/reports` (ranking por unidades e ingresos). Falta la otra mitad: productos **sin movimiento**.
- **Control de caja (punto 4) ya tiene apertura/cierre, `CashMovement` para ventas en efectivo, é historial de sesiones** (`/register/sessions`, `/register/movements`) — hecho en la sesión pasada. Falta la parte de **registrar manualmente** ingresos/egresos que no vienen de una venta (retiros, pagos en efectivo a un proveedor, etc.).

---

## Fase 1 — Clientes y crédito (fundamento para varios puntos)

### ✅ 1. Clientes reales + historial de compras — RESUELTO
**Qué hay que hacer:**
- Agregar campo `taxId` (NIT) a `Customer` — requiere migración.
- Reemplazar `CustomerPicker` (que hoy solo guarda un nombre suelto) por un buscador real: busca por nombre/teléfono/NIT, crea el cliente si no existe, y liga la venta a `customerId` de verdad (`createSale` ya tiene el campo `customerId` en el modelo `Sale`, pero la acción actual nunca lo llena).
- Pantalla `/customers`: listado, ficha de cliente con su historial de compras (join simple contra `Sale` donde `customerId = X`).

**Esfuerzo:** Medio · **Depende de:** nada · **Habilita:** #2

### ✅ 2. Ventas a crédito ("fiado") y cuentas por cobrar — RESUELTO
**Qué hay que hacer:**
- `Sale` necesita un estado de pago: agregar `PaymentStatus` (`PAID`/`PARTIAL`/`PENDING`) o reusar `storeCreditBalance` del cliente (restarle al vender a crédito, sumarle al abonar).
- Nuevo modelo `CustomerPayment` (abonos): monto, fecha, método, a qué cliente.
- POS: método de pago nuevo "Crédito" que no exige efectivo/tarjeta en el momento — solo se puede si el cliente está identificado (depende de #1).
- Pantalla `/customers/[id]` con botón "Registrar abono" y saldo pendiente visible.
- Reporte: total por cobrar (suma de saldos pendientes de todos los clientes).

**Esfuerzo:** Medio-Alto · **Depende de:** #1 (necesita cliente real, no un nombre suelto)

---

## Fase 2 — Inventario y devoluciones

### ✅ 5. Kardex consolidado — RESUELTO
**Qué falta:** una vista `/inventory/kardex` que liste TODOS los productos con su movimiento reciente en una sola tabla filtrable por fecha/tipo, en vez de tener que entrar producto por producto. Es más "juntar lo que ya hay" que construir de cero.

**Esfuerzo:** Bajo

### 7b. Productos sin movimiento *(la otra mitad de "más vendidos", que ya existe)*
**Qué hay que hacer:** query de productos activos que NO aparecen en `SaleLine` dentro de un rango de fechas (ej. últimos 30/60/90 días) — alerta simple de "esto no se está moviendo".

**Esfuerzo:** Bajo

### ✅ 9. Devoluciones y anulaciones — RESUELTO
**Qué hay que hacer:** esto sí es 100% nuevo pese a que el modelo ya existe.
- Server action `createReturn`: dado un `saleId` y las líneas a devolver, calcula el reembolso, repone `stockQty` del producto, crea `StockMovement` tipo `RETURN_IN`, y dispara `AuditLog` (acción `RETURN_PROCESSED`, que ya está en el enum documentado pero sin usar).
- UI: desde `/sales/[id]/receipt` o el historial, botón "Devolver" con selección de líneas y motivo.
- Decidir regla de negocio: ¿se puede devolver una venta ya facturada? ¿parcial o total?

**Esfuerzo:** Medio-Alto (toca stock, caja y auditoría a la vez)

### 8. Alertas inteligentes de reposición
**Qué hay que hacer:** calcular velocidad de venta (unidades/semana promedio de las últimas N semanas por producto) y comparar contra el stock actual para estimar "días de stock restante". Requiere una query de agregación un poco más elaborada que la alerta actual de stock mínimo fijo.

**Esfuerzo:** Medio · **Depende de:** tener suficiente historial de ventas acumulado para que la estimación sirva (no tiene sentido con pocos días de datos)

---

## Fase 3 — Proveedores y panel gerencial

### ✅ 3. Cuentas por pagar a proveedores — RESUELTO
**Qué hay que hacer:**
- `PurchaseOrder` no tiene ningún campo de dinero/pago hoy (ni monto total, ni fecha de vencimiento, ni si está pagada) — hay que agregarlos.
- Nuevo modelo `SupplierPayment` (abonos a proveedor), simétrico a `CustomerPayment` de la Fase 1.
- Pantalla `/suppliers/[id]` con saldo pendiente y botón "Registrar pago".

**Esfuerzo:** Medio · **Depende de:** nada, pero comparte patrón con #2 (conviene hacerlos juntos o uno inmediatamente después del otro)

### 4b. Control de caja: movimientos manuales
**Qué hay que hacer:** ya existe todo el modelo (`CashMovement` con tipos `PAID_IN`/`PAID_OUT` ya en el enum) — falta un formulario simple en `/register` para "Registrar salida de efectivo" (ej. pagarle a un proveedor en efectivo, un retiro) o "Registrar entrada" que no venga de una venta.

**Esfuerzo:** Bajo

### 12. Dashboard gerencial mejorado
**Qué hay que hacer:** el dashboard de inicio (`/`) hoy tiene stats fijos de ejemplo (`$0.00`, `4`, `2` — nunca se conectaron a datos reales, es deuda técnica vieja). Conectarlo a los mismos cálculos que ya existen en `/reports` (ventas del mes, utilidad, ticket promedio, top productos, por método de pago) más lo nuevo de esta fase (cuentas por cobrar/pagar), y agregar comparación contra el período anterior (ej. "+12% vs. la semana pasada").

**Esfuerzo:** Medio · **Depende de:** #2 y #3 para las cuentas por cobrar/pagar (el resto ya existe)

---

## Fase 4 — Arquitectura grande (opcional, solo si el negocio crece a varias sucursales)

### 10. Sucursales y almacenes
### 11. Transferencias entre almacenes

Esto es un cambio de arquitectura serio, no una feature más: hoy `Product.stockQty` es un solo número global — pasar a multi-sucursal significa que el stock, la caja, las ventas y los reportes tienen que filtrarse por sucursal en *todas partes* del sistema, no solo agregar una tabla nueva. Requiere:
- Modelo `Store` (sucursal/almacén).
- `stockQty` deja de vivir en `Product` y pasa a una tabla `ProductStock` por (producto, sucursal).
- Cada `Sale`, `CashRegisterSession`, `PurchaseOrder` queda ligada a una sucursal.
- Modelo `StockTransfer` con líneas, para #11.
- Todas las pantallas necesitan un selector de sucursal.

**Esfuerzo:** Alto (semanas, no días) · **Recomendación:** no arrancar esto hasta que el negocio realmente tenga una segunda sucursal confirmada — hacerlo antes es sobre-ingeniería.

---

## Fase 5 — Etapa 2 (ya en curso, aparte de este planning)

### 13. WhatsApp conectado de verdad
### 14. Pedido → venta → inventario en un solo flujo

Esto ya estaba planeado como la "Etapa 2" del proyecto original (bot de WhatsApp vía API oficial de Meta). La base de datos (`WhatsAppOrder`/`WhatsAppOrderLine`) y el webhook de verificación ya existen — falta la lógica de conversación del bot, que según lo hablado antes la vas a definir/entregar aparte. Cuando esa lógica esté lista, el punto 14 (que un pedido confirmado se convierta en venta real sin recargar productos a mano) se conecta reutilizando `createSale` tal cual ya está — no hace falta reinventar el flujo de venta, solo alimentarlo desde el pedido de WhatsApp en vez de desde el POS.

---

## Resumen priorizado

| # | Punto | Fase | Esfuerzo | Estado |
|---|-------|------|----------|--------|
| ✅ 1 | Clientes + historial — RESUELTO | 1 | Medio | Modelo existe, nada conectado |
| ✅ 2 | Ventas a crédito — RESUELTO | 1 | Medio-Alto | Nuevo (usa `storeCreditBalance` ya existente) |
| ✅ 5 | Kardex consolidado — RESUELTO | 2 | Bajo | Mayormente ya existe |
| 7b | Productos sin movimiento | 2 | Bajo | Nuevo (la mitad "top" ya existe) |
| ✅ 9 | Devoluciones/anulaciones — RESUELTO | 2 | Medio-Alto | Modelo existe, lógica 0% |
| 8 | Alertas inteligentes | 2 | Medio | Nuevo |
| ✅ 3 | Cuentas por pagar — RESUELTO | 3 | Medio | Nuevo |
| 4b | Caja: movimientos manuales | 3 | Bajo | Modelo existe, falta UI |
| 12 | Dashboard gerencial | 3 | Medio | Parcial (stats hardcodeados hoy) |
| 6 | Costo/margen/utilidad | — | — | ✅ **Ya hecho** |
| 4 | Apertura/cierre + historial caja | — | — | ✅ **Ya hecho** |
| 7a | Productos más vendidos | — | — | ✅ **Ya hecho** |
| 10 | Sucursales | 4 | Alto | Nuevo, solo si crece el negocio |
| 11 | Transferencias entre almacenes | 4 | Alto | Depende de #10 |
| 13 | WhatsApp conectado | 5 | — | Depende de la lógica que entregues |
| 14 | Pedido → venta → inventario | 5 | Bajo (una vez tengan #13) | Reutiliza `createSale` existente |

**Sugerencia de arranque:** Fase 1 completa (clientes + crédito) es la que más valor de negocio da por el esfuerzo, y de paso el NIT de cliente que pediste al inicio del mensaje queda resuelto ahí mismo. ¿Empezamos por el punto 1?
