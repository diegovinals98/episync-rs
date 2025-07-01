# Family Series Track V2 Backend

Backend modular para Family Series Track V2 construido con NestJS, siguiendo las mejores prácticas de arquitectura y patrones de diseño.

## 🏗️ Arquitectura

### Estructura Modular
- **Módulos independientes**: Cada funcionalidad está en su propio módulo
- **Separación por dominio**: Cada módulo maneja su propia lógica de negocio
- **Inyección de dependencias**: Los servicios se inyectan entre módulos cuando es necesario

### Características Principales

#### 🔐 Autenticación y Autorización
- Múltiples estrategias: JWT, Clerk, API Keys, Client Credentials
- Guards personalizados para proteger rutas específicas
- Decorators para extraer información del usuario actual
- Middleware para procesar requests antes de llegar a los controladores

#### 🗄️ Base de Datos
- TypeORM como ORM principal
- Migrations para cambios en el esquema
- Entidades con decorators de TypeORM
- Configuración centralizada por ambiente

#### 🌐 APIs y Endpoints
- Controladores REST para endpoints HTTP estándar
- DTOs para validación de datos de entrada
- Pipes de validación para transformar y validar requests
- Interceptors para modificar responses

#### 🔗 Integración Externa
- Servicios HTTP para llamadas a APIs externas (Aidbox, Particle Health)
- Webhooks para recibir notificaciones de servicios externos
- Configuración de APIs con tokens y URLs

#### 📧 Notificaciones
- Sistema de templates para emails y push notifications
- Cola de procesamiento para envío asíncrono
- Múltiples proveedores: Expo, email, etc.
- Tracking para seguimiento de envíos y clicks

#### 🛠️ Desarrollo y Testing
- Módulo de desarrollo con endpoints para testing y debugging
- Logging estructurado con diferentes niveles
- Configuración por ambiente: Dev, staging, production
- Documentación automática con Swagger/OpenAPI

#### 📊 Monitoreo y Analytics
- Métricas de uso y tracking de endpoints
- Stats de providers y estadísticas de uso
- Logs centralizados para debugging y monitoreo

#### 🔒 Seguridad
- Rate limiting para prevenir abuso de APIs
- Validación de entrada y sanitización de datos
- Headers de seguridad: CORS, CSP, etc.
- Encriptación para datos sensibles

## 🚀 Instalación

### Prerrequisitos
- Node.js (v18 o superior)
- npm o yarn
- PostgreSQL (opcional para desarrollo)

### Instalación de Dependencias
```bash
npm install
```

### Configuración de Variables de Entorno
```bash
cp env.example .env.local
```

Edita el archivo `.env.local` con tus configuraciones específicas.

### Ejecución en Desarrollo
```bash
npm run start:dev
```

La aplicación estará disponible en `http://localhost:4000`

### Documentación de la API
La documentación Swagger estará disponible en `http://localhost:4000/api/docs`

## 📁 Estructura del Proyecto

```
src/
├── config/                 # Configuración de la aplicación
│   ├── database/          # Configuración de base de datos
│   ├── logger/            # Configuración de logging
│   ├── configuration.ts   # Configuración centralizada
│   └── validation.ts      # Validación de variables de entorno
├── modules/               # Módulos de funcionalidad
│   ├── health/           # Endpoints de health check
│   ├── auth/             # Autenticación y autorización
│   ├── users/            # Gestión de usuarios
│   ├── notifications/    # Sistema de notificaciones
│   └── development/      # Herramientas de desarrollo
├── shared/               # Módulos compartidos
│   ├── decorators/       # Decorators personalizados
│   ├── guards/           # Guards de seguridad
│   ├── interceptors/     # Interceptors globales
│   └── pipes/            # Pipes de validación
└── main.ts              # Punto de entrada de la aplicación
```

## 🔧 Scripts Disponibles

- `npm run start:dev` - Ejecuta en modo desarrollo con hot reload
- `npm run start:debug` - Ejecuta en modo debug
- `npm run start:prod` - Ejecuta en modo producción
- `npm run build` - Compila el proyecto
- `npm run test` - Ejecuta los tests
- `npm run test:e2e` - Ejecuta tests end-to-end
- `npm run lint` - Ejecuta el linter
- `npm run format` - Formatea el código

## 🐳 Docker

### Construir la imagen
```bash
docker build -t family-series-track-backend .
```

### Ejecutar con Docker Compose
```bash
docker-compose up -d
```

## 📝 Patrones de Diseño Implementados

- **Repository Pattern**: Para acceso a datos
- **Service Layer**: Para lógica de negocio
- **Factory Pattern**: Para creación de objetos complejos
- **Observer Pattern**: Para eventos y notificaciones

## 🔍 Health Checks

La aplicación incluye endpoints de health check:

- `GET /api/v1/health` - Health check completo
- `GET /api/v1/health/ping` - Ping simple
- `GET /api/v1/health/status` - Estado de la aplicación

## 📄 Licencia

MIT License - ver archivo LICENSE para más detalles.

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request 