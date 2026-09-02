# Sistema de notificaciones (WhatsApp + Email)

Este documento tiene dos partes: (1) qué falta configurar para que las
notificaciones empiecen a mandarse de verdad, y (2) las 17 plantillas de
WhatsApp que hay que dar de alta en **Meta Business Manager** — sin esto,
todo intento de envío por WhatsApp va a fallar con un error real de Meta
("template not found"), no es un bug del código.

## 1. Checklist de configuración

- [ ] Completar en `.env` (producción): `WHATSAPP_ACCESS_TOKEN`,
      `WHATSAPP_PHONE_NUMBER_ID` (ya los tenés de Meta for Developers),
      `RESEND_API_KEY` y `RESEND_FROM_EMAIL` (de tu cuenta de Resend —
      necesitás un dominio verificado ahí, o usar el dominio de pruebas de
      Resend mientras tanto).
- [ ] Crear y esperar la aprobación de las 17 plantillas de la sección 2 en
      Meta Business Manager (WhatsApp Manager → Plantillas de mensajes).
- [ ] En `/settings` (como ADMIN): cargar el WhatsApp y el email del dueño,
      revisar los umbrales de "venta grande"/"ajuste fuerte" y el plazo de
      fiado, y **activar los switches "Activar envío por WhatsApp/email"**
      (quedan apagados por defecto justamente para no intentar mandar nada
      hasta que las plantillas estén aprobadas).
- [ ] Usar los botones "Enviar WhatsApp de prueba" / "Enviar email de
      prueba" de esa misma página para confirmar que las credenciales
      funcionan (mandan contra el teléfono/email que acabás de guardar).

## 2. Plantillas de WhatsApp a crear en Meta Business Manager

Para todas: categoría **Utility** (son transaccionales, no marketing —
Meta las aprueba más rápido así), idioma **Español (es)**.

Las variables `{{1}}`, `{{2}}`... tienen que ir en este orden exacto — es
el orden en que el código las manda.

| # | Nombre exacto | Texto de la plantilla |
|---|---|---|
| 1 | `stock_bajo` | Quedan {{1}} {{2}} de {{3}} en {{4}}. Reposición recomendada. |
| 2 | `producto_agotado` | El producto {{1}} llegó a 0 unidades en {{2}}. |
| 3 | `venta_grande` | Se registró una venta de Bs {{1}} en {{2}}. |
| 4 | `cierre_caja` | Caja cerrada en {{1}}: ventas Bs {{2}}, efectivo Bs {{3}}, QR Bs {{4}}. |
| 5 | `diferencia_caja` | Se detectó una diferencia de Bs {{1}} en el cierre de caja en {{2}}. |
| 6 | `cuenta_por_cobrar_vencida` | Cliente {{1}} tiene Bs {{2}} vencidos desde hace {{3}} días. |
| 7 | `cuenta_por_pagar_vencer` | Factura del proveedor {{1}} vence {{2}}: Bs {{3}}. |
| 8 | `oc_recibida` | Ingresaron {{1}} unidades del proveedor {{2}}. |
| 9 | `nuevo_pedido_whatsapp` | Nuevo pedido #{{1}} por Bs {{2}}. Pendiente de confirmación. |
| 10 | `pedido_confirmado` | Tu pedido #{{1}} fue confirmado. |
| 11 | `pedido_entregado` | Tu pedido #{{1}} fue entregado. ¡Gracias por tu compra! |
| 12 | `venta_credito_registrada` | Compra registrada por Bs {{1}}. Saldo pendiente: Bs {{2}}. |
| 13 | `pago_recibido` | Recibimos tu pago de Bs {{1}}. Saldo pendiente: Bs {{2}}. |
| 14 | `resumen_diario` | Hoy vendiste Bs {{1}}, {{2}} ventas, ticket promedio Bs {{3}}. |
| 15 | `actividad_sospechosa` | Se anuló una venta de Bs {{1}} por el usuario {{2}}. |
| 16 | `ajuste_inventario` | Se ajustaron {{1}} unidades del producto {{2}} en {{3}}. |
| 17 | `prueba_notificacion` | Notificación de prueba enviada el {{1}}. |

El **resumen semanal** (punto 14 de tu lista original) va solo por email,
no necesita plantilla de WhatsApp.

## 3. Qué dispara cada notificación

| Evento | Se dispara desde |
|---|---|
| Stock bajo / producto agotado | Cada venta (`createSale`) y cada ajuste manual (`adjustStock`) que deja el stock de un producto en o debajo del mínimo — una sola vez por producto/sucursal/día |
| Venta grande | `createSale`, cuando el total ≥ umbral configurado en `/settings` |
| Cierre de caja / diferencia de caja | `POST /api/register/close` |
| Cuenta por cobrar vencida | Chequeo diario automático (20:00, hora Bolivia) |
| Cuenta por pagar próxima a vencer | Chequeo diario automático, órdenes que vencen en los próximos 3 días |
| Nueva OC recibida | `receivePurchaseOrder` |
| Pedido nuevo / confirmado / entregado | `/orders` (alta y cambio de estado manual — o el bot de Etapa 2 cuando exista, llamando a `createWhatsAppOrder`/`updateWhatsAppOrderStatus`) |
| Venta a crédito registrada / pago recibido | `createSale` (método CRÉDITO) y `registerCustomerPayment` |
| Resumen diario | Automático, 20:00 hora Bolivia |
| Resumen semanal | Automático, lunes 08:00 hora Bolivia (solo email) |
| Actividad sospechosa | `voidSale` (anulación de venta) |
| Ajuste fuerte de inventario | `adjustStock`, cuando la cantidad ajustada ≥ umbral configurado |

Todo el motor vive en `lib/notifications/` y cada envío (exitoso o
fallido) queda registrado en la tabla `notification_logs` — útil para
depurar sin tener que revisar logs del servidor.
