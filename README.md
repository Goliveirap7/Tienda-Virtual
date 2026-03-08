# 🛒 F&G Importaciones — Tienda Virtual

**Demo en vivo:** [incomparable-frangipane-01298a.netlify.app](https://incomparable-frangipane-01298a.netlify.app)

![Captura de la Tienda Virtual F&G](https://res.cloudinary.com/dvaeqzm95/image/upload/v1772914834/oudwr8tsd5rm9h8vxujg.png)
![Captura de la Tienda Virtual F&G](https://res.cloudinary.com/dvaeqzm95/image/upload/v1772914978/xh6gryaaazz41kxav8z2.png)

---

## 🧠 Historia del proyecto

Llevo cerca de 2 años creando y actualizando el catálogo de productos de una tienda de importaciones local. Ese catálogo vivía en PDF y lo generaba de forma semi-automatizada con Canva, lo cual ahorraba tiempo pero tenía limitaciones evidentes: sin búsqueda, sin filtros y difícil de compartir.

Decidí dar el salto y construir una **web funcional como catálogo virtual**, pensada para mostrar productos y facilitar la compra presencial — no hay carrito de compras porque las ventas son físicas. El botón de compra redirige directamente a WhatsApp.

---

## 🛠️ Stack Tecnológico

### Frontend & Backend
- **Next.js 15 (App Router)** — renderizado del lado del servidor (SSR) para mejor SEO y velocidad de carga. Sus API Routes permiten manejar lógica de servidor sin necesitar un backend separado.
- **TypeScript** — tipado estático que reduce errores en tiempo de desarrollo y hace el código más mantenible.
- **React** — para componentes interactivos como el panel admin, modales y filtros del catálogo.

### Base de Datos & Autenticación
- **Supabase (PostgreSQL)** — base de datos relacional en la nube con autenticación incluida. Elegido por su plan gratuito, integración nativa con Next.js mediante `@supabase/ssr`, y políticas de seguridad a nivel de fila (RLS).

### Almacenamiento de Imágenes
- **Cloudinary** — recibe la imagen original, la optimiza automáticamente (convierte a WebP, reduce resolución) y entrega un enlace CDN ultra-ligero. Resultado: la página carga fluido con 321+ productos.

### Deploy & CI/CD
- **Netlify** — deploy automático conectado a GitHub. Cada `git push` a `main` dispara un re-deploy automático sin configuración adicional.

---

## ⚙️ Panel de Administrador

Para evitar tocar el código cada vez que hay cambios en inventario, construí un panel admin completo:

- 🔐 **Autenticación segura** con Supabase Auth + cookies httpOnly y Next.js Server Actions
- 📦 **Importación masiva de productos** vía archivo CSV usando **PapaParse** para el parseo en el navegador
- ➕ **Añadir productos manualmente** con un formulario modal, sin necesidad de archivos
- 🖼️ **Gestor de imágenes** con Drag & Drop para intercambiar fotos entre productos, más editor básico (rotar, etc.)
- ✏️ **Edición de productos** en línea (nombre, precio, stock, categoría, prioridad)
- 🗑️ **Eliminación sincronizada**: al borrar un producto o imagen desde el panel, se elimina también de Cloudinary — evitando que el storage se llene con archivos huérfanos
- 📅 **Fecha de subida** visible en la tabla de inventario para tener trazabilidad de cuándo se subió cada lote

---

## 📱 Responsive Design

La tienda funciona tanto en escritorio como en dispositivos móviles, con menú hamburguesa en móvil y grid adaptable a distintas resoluciones.

---

## 📂 Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 🚀 Cómo correr localmente

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

El panel de administrador está en `/admin/login`.
