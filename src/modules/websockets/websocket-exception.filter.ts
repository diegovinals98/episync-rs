import { ArgumentsHost, Catch } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Catch(WsException)
export class WsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const error = exception.getError();
    const message = exception.message;

    client.emit("error", {
      message: message || "Error en WebSocket",
      error: error,
      timestamp: new Date(),
    });
  }
}
