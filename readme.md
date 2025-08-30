Proyecto Final – VĀLI Ecommerce 🛍️

Este proyecto corresponde a la entrega final de JavaScript (Coderhouse).
Se trata de un Ecommerce funcional con catálogo de productos dinámico y carrito persistente.

✅ Correcciones aplicadas según devolución

Carga asíncrona de datos: los productos se obtienen mediante fetch() desde un JSON embebido (data:URL).

Imágenes mejoradas: se asignaron fotos de las secciones Colecciones e Inicio para evitar repetición de imágenes.

Interactividad avanzada:

Carrito lateral con botones (+, −, eliminar, vaciar).

Persistencia en LocalStorage (los ítems se mantienen al recargar).

Proceso de compra simulado con SweetAlert2 y validación de campos.

Manejo de errores: try/catch con alerta de error si falla la carga de productos.

Accesibilidad básica: uso de aria-live en el badge y cantidades del carrito.

Diseño responsivo: panel del carrito con scroll interno para listas largas y adaptación a mobile.

## 📂 Estructura del proyecto

``
vali-uy/
│
├── config/ # Archivos SCSS de configuración
│ ├── lazyloading.scss
│ ├── media-queries.scss
│ ├── mixins.scss
│ ├── reset.scss
│ └── var.scss
│
├── css/
│ ├── style.css
│ └── style.css.map
│
├── images/
│ ├── Colecciones/
│ ├── Contactanos/
│ ├── Inicio/
│ ├── Productos/
│ ├── Sobrenosotros/
│ └── vali-logo/
│
├── js/
│ └── main.js # Lógica principal del carrito y productos
│
├── Pages/
│ ├── colecciones.html
│ ├── contactanos.html
│ ├── productos.html
│ └── sobre_nosotros.html
│
├── index.html
└── readme.md

🚀Tecnologias

JavaScript (ES6+)

SweetAlert2 (alertas y formularios)

LocalStorage

Bootstrap 4

CSS3 (animaciones y responsividad)
