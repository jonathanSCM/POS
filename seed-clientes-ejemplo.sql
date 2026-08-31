-- Clientes de ejemplo (datos de prueba, no reales) para producción.
-- Ejecutar UNA sola vez: usa NOT EXISTS por taxId/phone para evitar duplicados
-- si se corre más de una vez por error.

INSERT INTO customers (id, name, phone, "taxId", email, address, "storeCreditBalance", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.phone, v."taxId", v.email, v.address, 0, now(), now()
FROM (VALUES
  ('Juan Carlos Mamani', '70123456', '5012345', 'juan.mamani@example.com', 'Av. Ballivián #234, Cochabamba'),
  ('María Fernanda Rojas', '71234567', '6023456', 'maria.rojas@example.com', 'Calle Sucre #567, Cochabamba'),
  ('Distribuidora El Sol S.R.L.', '72345678', '1023456011', 'ventas@elsol.com.bo', 'Av. Blanco Galindo Km 4, Cochabamba'),
  ('Roberto Quispe Fernández', '73456789', '7034567', 'roberto.quispe@example.com', 'Zona Queru Queru, Cochabamba'),
  ('Comercial Andina Ltda.', '74567890', '1034567019', 'contacto@comercialandina.com.bo', 'Av. América Este #890, Cochabamba')
) AS v(name, phone, "taxId", email, address)
WHERE NOT EXISTS (
  SELECT 1 FROM customers c WHERE c."taxId" = v."taxId" OR c.phone = v.phone
);
