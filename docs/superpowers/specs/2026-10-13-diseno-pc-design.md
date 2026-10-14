# Diseño adaptable a PC — Especificación

**Fecha:** 2026-10-13 · **Repo:** AppEmprendedores_movil2 · **Estado:** pendiente de revisión

## Objetivo

La app debe poder usarse igual en celular y en PC. Hoy todo está pensado para celular: en PC el
contenido se estira a todo el ancho y la navegación es una barra de pestañas abajo.
**El objetivo es cambiar solo la presentación en PC; en celular todo debe verse igual que hoy.**
No cambia la lógica, los datos ni las funcionalidades.

## Decisiones tomadas

- Enfoque "B": un solo código con layout adaptable (no una interfaz separada para web).
- Navegación en PC: **menú lateral fijo** (opción A de la maqueta), no barra superior.
- Menú lateral: Inicio, Productos, IA, Finanzas + **Configuración** abajo.
- Finanzas y Productos: distribución a criterio de la implementación (ver sección 4).

## 1. Puntos de corte

| Ancho | Navegación | Contenido |
|---|---|---|
| < 768px | Barra de pestañas abajo (sin cambios) | Una columna (sin cambios) |
| 768–991px | Barra de pestañas abajo | Una columna centrada, máx. 720px |
| ≥ 992px | Menú lateral fijo (~220px), sin barra de abajo | Centrado, máx. 1100px, con cuadrículas |

Las variables de corte se definen una sola vez (`src/theme/breakpoints.scss`) y se reutilizan.

## 2. Estructura y navegación (`tabs.page`)

- `tabs.page` ya envuelve todas las páginas internas: el menú lateral se agrega ahí.
  Las rutas no cambian y las páginas no necesitan saber si están en PC o en celular.
- En ≥ 992px: se oculta `ion-tab-bar` con CSS y se muestra el menú lateral; el área de
  contenido se desplaza a la derecha del menú.
- Menú lateral:
  - Marca "AppEmprendedores" arriba.
  - Inicio (`/tabs/dashboard`), Productos (`/tabs/product`), IA (`/tabs/ia-panel`),
    Finanzas (`/tabs/finance`) — mismo orden e iconos que las pestañas actuales.
  - **Configuración** (`/tabs/settings`) separado, al final del menú.
  - Ítem activo resaltado en naranja `#E86F00` (el color actual de las pestañas), según la ruta activa.
  - Funciona en modo claro y oscuro con las variables existentes (`--ion-card-background`, etc.).
- El botón de engranaje junto a "Hola, [nombre]" en Inicio se **oculta en ≥ 992px**
  (ya está en el menú); en celular se mantiene.
- Login, registro y onboarding no tienen menú: en PC se muestran centrados con ancho fijo.

## 3. Reglas generales de contenido (`global.scss`)

- Contenedor de página centrado: máx. 720px (tablet) / 1100px (PC), con márgenes laterales.
- Modales personalizados (`.modal-overlay` de Inicio y Finanzas): en ≥ 768px se muestran
  como diálogo centrado de ~560px con fondo oscurecido, no a pantalla completa.
- Formularios (login, registro, onboarding, negocio, perfil, configuración): columna centrada,
  ~480px en login/registro/onboarding y ~640px en negocio/perfil/configuración.

## 4. Por página (≥ 992px)

| Página | Distribución en PC |
|---|---|
| **Inicio** | Igual a la maqueta A: tarjeta Balance General (2/3) + columna de indicadores (1/3); debajo Acciones rápidas (1/3) + Actividad reciente (2/3) |
| **Finanzas** | Filtros (búsqueda + botones) en una sola fila. Las tarjetas de transacciones y gastos fijos se muestran como **filas tipo tabla** usando CSS grid sobre el mismo HTML (icono · descripción/meta · monto · acciones), sin duplicar la plantilla. Los formularios de alta (venta, transacción, gasto fijo) siguen apareciendo dentro de la página, con ancho máx. 640px centrado. El modal "+" de acciones pasa a diálogo centrado (regla general) |
| **Productos** | Cuadrícula de tarjetas `repeat(auto-fill, minmax(260px, 1fr))` (2–4 columnas según ancho) |
| **IA / Chat** | Columna centrada máx. ~800px |
| **Negocio, Perfil, Configuración** | Columna de formulario centrada ~640px |

Los cambios por página van solo dentro de `@media (min-width: 768px)` / `(min-width: 992px)`,
de modo que el CSS móvil existente no se modifica. Donde haga falta agrupar bloques para la
cuadrícula (p. ej. Inicio), se agregan contenedores `<div>` en la plantilla sin cambiar el
contenido ni el orden en celular.

## 5. Fuera de alcance

- Cambios de lógica, datos o endpoints.
- Rediseño visual (colores, tipografía, iconos) más allá de la distribución.
- Arreglar el ESLint del proyecto o los tests que ya fallaban (`dashboard.page.spec.ts`).

## 6. Verificación

- `ng build` y `tsc` sin errores.
- **Capturas automáticas** con Edge headless (puppeteer-core, en un directorio temporal, sin
  agregar dependencias al repo), con sesión real inyectada en `localStorage`
  (`CapacitorStorage.idToken` / `CapacitorStorage.uid`), de cada página en:
  - 390×844 (celular): comparadas con capturas tomadas **antes** de los cambios — deben ser iguales.
  - 820×1180 (tablet) y 1440×900 (PC): revisión visual.
- Modo claro y oscuro en PC.
- Las capturas se comparten con el usuario para aprobación antes del commit.
