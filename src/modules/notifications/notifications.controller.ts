import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PushNotificationService } from "./push-notification.service";

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly pushNotificationService: PushNotificationService
  ) {}

  @Post("test-push")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async testPushNotification(@Body("expo_push_token") expoPushToken: string) {
    if (!expoPushToken) {
      return {
        success: false,
        error: "expo_push_token es requerido",
      };
    }

    try {
      const result =
        await this.pushNotificationService.sendPushNotificationToMultiple(
          [expoPushToken],
          "Notificación de Prueba",
          "Esta es una notificación de prueba desde el backend",
          "Test",
          {
            type: "test_notification",
            timestamp: new Date().toISOString(),
          }
        );

      return {
        success: true,
        message: "Notificación de prueba enviada",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: "Error enviando notificación: " + error.message,
      };
    }
  }
}
