# Encuestados ULEAM

Aplicación de encuestas con **Vue 3** y **Supabase**.

## Estructura del proyecto

```
Encuestas_Vue/
├── index.html                 # Entrada → login
├── HTML/                      # Vistas HTML
├── CSS/                       # Estilos
├── src/js/
│   ├── core/db.js             # Conexión y operaciones Supabase
│   └── views/                 # Lógica Vue por pantalla
├── supabase/schema.sql        # Referencia del esquema (opcional)
```

## Cómo ejecutar

1. En Supabase, confirma que las tablas coinciden con `supabase/schema.sql`.
2. Activa las políticas RLS (sección final del SQL) si ves errores 401/403.
3. Abre la carpeta con **Live Server** (raíz del proyecto) y entra por **`index.html`** (única pantalla de ingreso).
4. Coloca `LOGO-ULEAM.png` dentro de `HTML/` (referenciado desde el login).

## Tablas Supabase

| Tabla | Uso |
|-------|-----|
| `usuarios` | Login y registro |
| `encuestas` | Encuestas creadas |
| `preguntas` | Preguntas y conteo de votos (JSONB) |
| `respuestas_usuarios` | Evita doble voto |
| `respuestas_detalle` | Detalle por participante (modal) |

La sesión activa se guarda solo en `localStorage` (`usuarioSesion`).
