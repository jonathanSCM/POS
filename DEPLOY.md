# Guía de despliegue en VPS

## 0. Despliegue con Docker / Coolify (recomendado)

El proyecto incluye un `Dockerfile` multi-etapa listo para usar. En Coolify:

1. Crea un nuevo recurso **"Application"** apuntando a este repositorio de GitHub,
   con **Build Pack: Dockerfile** (Coolify lo detecta solo si está en la raíz).
2. En **Puertos expuestos**, usa `3000` (es el `EXPOSE` del Dockerfile).
3. En **Variables de entorno**, configura:

   ```
   DATABASE_URL=postgresql://usuario:contraseña@host:5432/pos_completo?sslmode=disable
   NEXTAUTH_SECRET=<genera uno nuevo con: openssl rand -hex 32>
   NEXTAUTH_URL=https://tu-dominio.com
   WHATSAPP_VERIFY_TOKEN=
   WHATSAPP_ACCESS_TOKEN=
   WHATSAPP_PHONE_NUMBER_ID=
   ```

   Si usas la base de datos Postgres que Coolify puede crear como servicio aparte,
   usa el host interno que te da Coolify (algo como `nombre-servicio:5432`), no `localhost`.
4. Al desplegar, el contenedor **aplica las migraciones automáticamente** (`prisma migrate
   deploy`) antes de arrancar el servidor — no hace falta ejecutar nada a mano.
5. La primera vez, crea el usuario administrador inicial directamente en la base de datos
   (la imagen de producción no incluye las herramientas para correr el script de seed en
   TypeScript). Desde el editor SQL de Coolify o cualquier cliente de Postgres, ejecuta:
   ```sql
   INSERT INTO users (id, name, email, "passwordHash", role, active, "createdAt", "updatedAt")
   VALUES ('admin-seed-001', 'Admin', 'admin@pos.local',
     '$2b$10$nxJ.RMrQ0X.le6bIEb25IuEusBxp/OjSioRgUFU9g1s2//E.RDR/K',
     'ADMIN', true, now(), now());
   ```
   Esto crea el usuario `admin@pos.local` con contraseña `admin123` (el mismo hash bcrypt
   que usa el seed local) — **cámbiala de inmediato** desde `/users` una vez que inicies sesión.
6. Configura tu dominio en Coolify (genera HTTPS automático con Let's Encrypt).

El resto de esta guía (secciones 1-9) describe el despliegue manual sin Docker, por si
alguna vez lo necesitas en un VPS sin Coolify.

## 1. Requisitos previos en el VPS

- Node.js 20 LTS (o superior)
- Postgres accesible (local en el VPS o remoto)
- Un dominio apuntando a la IP del VPS (registro A en tu DNS)
- PM2 instalado globalmente: `npm install -g pm2`
- Nginx instalado (reverse proxy) y Certbot (SSL gratis)

## 2. Copiar el proyecto al VPS

Sube todo el proyecto (excepto `node_modules`, `.next`) a una carpeta en el servidor,
por ejemplo `/var/www/pos-sistema`. Puedes usar `scp`, `rsync`, o clonar desde git.

## 3. Variables de entorno de producción

Crea el archivo `.env` en la raíz del proyecto en el VPS:

```
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/pos_completo?sslmode=disable"
NEXTAUTH_SECRET="<genera uno nuevo con: openssl rand -hex 32>"
NEXTAUTH_URL="https://tu-dominio.com"

WHATSAPP_VERIFY_TOKEN="<lo defines tú, se usa al configurar el webhook en Meta>"
WHATSAPP_ACCESS_TOKEN="<token de acceso de Meta for Developers>"
WHATSAPP_PHONE_NUMBER_ID="<ID del número de WhatsApp Business>"
```

**Importante:** `NEXTAUTH_URL` debe ser la URL pública real (con `https://` y el dominio),
no `localhost`. Si Postgres del VPS exige SSL, quita `?sslmode=disable` de `DATABASE_URL`.

## 4. Instalar dependencias y migrar la base de datos

```bash
cd /var/www/pos-sistema
npm ci
npx prisma migrate deploy
npx prisma db seed   # solo la primera vez, para crear el usuario admin inicial
```

`migrate deploy` (a diferencia de `migrate dev`) solo aplica las migraciones existentes,
sin generar nuevas ni pedir confirmación — es el comando correcto para producción.

## 5. Compilar

```bash
npm run build
```

Esto genera `.next/standalone/server.js`, un servidor Node autocontenido.

## 6. Levantar con PM2

Como el build es `standalone`, hay que copiar los archivos estáticos y `public/` junto al server:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Luego:

```bash
PORT=3000 pm2 start .next/standalone/server.js --name pos-sistema
pm2 save
pm2 startup   # sigue las instrucciones que imprime, para que arranque solo al reiniciar el VPS
```

## 7. Nginx como reverse proxy + HTTPS

Archivo `/etc/nginx/sites-available/pos-sistema`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/pos-sistema /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d tu-dominio.com
```

Certbot configura HTTPS automáticamente y renueva el certificado solo.

## 8. Webhook de WhatsApp (Etapa 2)

Cuando tengas credenciales de Meta for Developers, configura el webhook apuntando a:

```
https://tu-dominio.com/api/whatsapp/webhook
```

Con el mismo `WHATSAPP_VERIFY_TOKEN` que pusiste en el `.env`. La lógica de conversación del
bot todavía no está implementada — el endpoint solo registra los mensajes entrantes por ahora.

## 9. Actualizar la app en el futuro

```bash
cd /var/www/pos-sistema
git pull   # o subir los archivos nuevos
npm ci
npx prisma migrate deploy
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart pos-sistema
```
