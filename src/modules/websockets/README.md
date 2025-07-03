# WebSockets Module

Este módulo maneja todas las comunicaciones en tiempo real usando Socket.IO.

## 🚀 Configuración

### Conexión desde el Frontend

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  auth: {
    token: "tu-jwt-token-aqui",
  },
  withCredentials: true,
});
```

## 📡 Eventos Disponibles

### Eventos del Cliente al Servidor

#### `join-group`

Unirse a un grupo para recibir notificaciones.

```javascript
socket.emit("join-group", { groupId: 123 });
```

**Payload:**

```json
{
  "groupId": 123
}
```

#### `leave-group`

Salir de un grupo.

```javascript
socket.emit("leave-group", { groupId: 123 });
```

**Payload:**

```json
{
  "groupId": 123
}
```

#### `watch-episode`

Marcar un episodio como visto.

```javascript
socket.emit("watch-episode", {
  groupId: 123,
  seriesId: 456,
  episodeId: 789,
});
```

**Payload:**

```json
{
  "groupId": 123,
  "seriesId": 456,
  "episodeId": 789
}
```

#### `group-activity`

Notificar nueva actividad en el grupo.

```javascript
socket.emit("group-activity", {
  groupId: 123,
  type: "series_added",
  data: { seriesName: "Breaking Bad" },
});
```

**Payload:**

```json
{
  "groupId": 123,
  "type": "series_added",
  "data": {
    "seriesName": "Breaking Bad"
  }
}
```

### Eventos del Servidor al Cliente

#### `connected`

Confirmación de conexión exitosa.

```javascript
socket.on("connected", (data) => {
  console.log("Conectado:", data.message);
  console.log("Usuario:", data.user);
});
```

**Response:**

```json
{
  "message": "Conectado exitosamente",
  "user": {
    "id": 1,
    "username": "diegovinals"
  }
}
```

#### `joined-group`

Confirmación de unirse a un grupo.

```javascript
socket.on("joined-group", (data) => {
  console.log("Te uniste al grupo:", data.groupId);
});
```

**Response:**

```json
{
  "groupId": 123,
  "message": "Te has unido al grupo exitosamente"
}
```

#### `user-joined-group`

Notificación cuando otro usuario se une al grupo.

```javascript
socket.on("user-joined-group", (data) => {
  console.log(`${data.username} se unió al grupo`);
});
```

**Response:**

```json
{
  "userId": 2,
  "username": "mariavinals",
  "groupId": 123,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `episode-watched`

Notificación cuando alguien marca un episodio como visto.

```javascript
socket.on("episode-watched", (data) => {
  console.log(`${data.username} vio el episodio ${data.episodeId}`);
});
```

**Response:**

```json
{
  "userId": 2,
  "username": "mariavinals",
  "groupId": 123,
  "seriesId": 456,
  "episodeId": 789,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `group-activity`

Notificación de actividad general del grupo.

```javascript
socket.on("group-activity", (data) => {
  console.log("Nueva actividad:", data.type, data.data);
});
```

**Response:**

```json
{
  "userId": 2,
  "username": "mariavinals",
  "groupId": 123,
  "type": "series_added",
  "data": {
    "seriesName": "Breaking Bad"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `error`

Notificación de errores.

```javascript
socket.on("error", (data) => {
  console.error("Error:", data.message);
});
```

**Response:**

```json
{
  "message": "Error al unirse al grupo",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🔧 Uso desde Otros Servicios

### Emitir eventos desde servicios

```typescript
import { WebSocketsGateway } from "@/modules/websockets/websockets.gateway";

@Injectable()
export class GroupsService {
  constructor(private websocketsGateway: WebSocketsGateway) {}

  async addSeriesToGroup(groupId: number, seriesData: any) {
    // ... lógica de añadir serie

    // Notificar a todos los miembros del grupo
    this.websocketsGateway.emitToGroup(groupId, "series-added", {
      seriesName: seriesData.name,
      addedBy: user.username,
    });
  }
}
```

### Emitir eventos a un usuario específico

```typescript
this.websocketsGateway.emitToUser(userId, "notification", {
  message: "Tienes una nueva notificación",
});
```

## 🔐 Autenticación

La autenticación se maneja automáticamente usando JWT tokens. El token debe enviarse en:

1. **Handshake inicial:**

```javascript
const socket = io("http://localhost:4000", {
  auth: {
    token: "tu-jwt-token",
  },
});
```

2. **Headers de autorización:**

```javascript
const socket = io("http://localhost:4000", {
  extraHeaders: {
    Authorization: "Bearer tu-jwt-token",
  },
});
```

## 🌐 Configuración CORS

El gateway está configurado para aceptar conexiones desde:

- `http://localhost:3000` (desarrollo)
- `process.env.FRONTEND_URL` (producción)

## 📊 Debugging

Para ver clientes conectados:

```typescript
// En el gateway
const connectedClients = this.getConnectedClients();
console.log("Clientes conectados:", connectedClients);
```

## 🚨 Manejo de Errores

Todos los errores se capturan automáticamente y se envían al cliente como eventos `error`. Los errores comunes incluyen:

- Token no proporcionado
- Token inválido
- Error al unirse/salir de grupos
- Errores de autenticación
