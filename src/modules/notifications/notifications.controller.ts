import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  NotificationType,
  TestNotificationDto,
} from "./dto/test-notification.dto";
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
  @ApiOperation({ summary: "Enviar notificación de prueba básica" })
  @ApiResponse({
    status: 200,
    description: "Notificación de prueba enviada",
  })
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

  @Post("test-by-type")
  @ApiOperation({
    summary: "Enviar notificación de prueba según el tipo especificado",
    description:
      "Envía una notificación de prueba del tipo especificado con datos de ejemplo",
  })
  @ApiBody({ type: TestNotificationDto })
  @ApiResponse({
    status: 200,
    description: "Notificación enviada exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Notificación enviada exitosamente",
        },
        data: {
          type: "object",
          properties: {
            sent: { type: "number", example: 1 },
            failed: { type: "number", example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Datos inválidos",
  })
  async testNotificationByType(@Body() testDto: TestNotificationDto) {
    const { expo_push_token, notification_type } = testDto;

    try {
      let result;
      let messageSent = {
        title: "",
        body: "",
        subtitle: "",
        data: null,
      };

      switch (notification_type) {
        case NotificationType.EPISODE_WATCHED:
          messageSent = {
            title: "Capitulo visto!",
            body: "Usuario de Prueba: Temporada 1. Capitulo 5",
            subtitle: "Grupo de Prueba: Stranger Things",
            data: {
              type: "episode_watched",
              groupName: "Grupo de Prueba",
              seriesName: "Stranger Things",
              episodeNumber: 5,
              userName: "Usuario de Prueba",
              timestamp: new Date().toISOString(),
              seriesId: 66732,
              groupId: 1,
            },
          };
          result = await this.pushNotificationService.notifyEpisodeWatched(
            "Grupo de Prueba",
            "Stranger Things",
            5,
            1, // seasonNumber
            "Usuario de Prueba",
            [expo_push_token],
            1, // groupId
            66732 // seriesId
          );
          break;

        case NotificationType.COMMENT_ADDED:
          messageSent = {
            title: "Nuevo Comentario!",
            body: "Usuario de Prueba - Este es un comentario de prueba",
            subtitle: "Grupo de Prueba: Stranger Things",
            data: {
              type: "comment_added",
              groupName: "Grupo de Prueba",
              seriesName: "Stranger Things",
              userName: "Usuario de Prueba",
              commentMessage: "Este es un comentario de prueba",
              timestamp: new Date().toISOString(),
            },
          };
          result = await this.pushNotificationService.notifyCommentAdded(
            "Grupo de Prueba",
            "Stranger Things",
            "Usuario de Prueba",
            [expo_push_token],
            "Este es un comentario de prueba"
          );
          break;

        case NotificationType.SERIES_ADDED:
          messageSent = {
            title: "Nueva Serie!",
            body: "Stranger Things: Usuario de Prueba ha añadido al grupo Grupo de Prueba",
            subtitle: "",
            data: {
              type: "series_added",
              groupName: "Grupo de Prueba",
              seriesName: "Stranger Things",
              addedByUserName: "Usuario de Prueba",
              timestamp: new Date().toISOString(),
            },
          };
          result = await this.pushNotificationService.notifySeriesAdded(
            "Grupo de Prueba",
            "Stranger Things",
            [expo_push_token],
            "Usuario de Prueba"
          );
          break;

        case NotificationType.SERIES_REMOVED:
          messageSent = {
            title: "Serie Eliminada!",
            body: "Stranger Things: Usuario de Prueba ha eliminado del grupo Grupo de Prueba",
            subtitle: "",
            data: {
              type: "series_removed",
              groupName: "Grupo de Prueba",
              seriesName: "Stranger Things",
              removedByUserName: "Usuario de Prueba",
              timestamp: new Date().toISOString(),
            },
          };
          result = await this.pushNotificationService.notifySeriesRemoved(
            "Grupo de Prueba",
            "Stranger Things",
            [expo_push_token],
            "Usuario de Prueba"
          );
          break;

        case NotificationType.GROUP_CREATED:
          messageSent = {
            title: "Grupo Nuevo!",
            body: "Usuario de Prueba te ha añadido al grupo: Grupo de Prueba",
            subtitle: "",
            data: {
              type: "group_created",
              groupName: "Grupo de Prueba",
              adminUserName: "Usuario de Prueba",
              timestamp: new Date().toISOString(),
            },
          };
          result = await this.pushNotificationService.notifyGroupCreated(
            "Grupo de Prueba",
            "Usuario de Prueba",
            [expo_push_token]
          );
          break;

        default:
          return {
            success: false,
            error: `Tipo de notificación no válido: ${notification_type}`,
          };
      }

      return {
        success: true,
        message: `Notificación de tipo ${notification_type} enviada exitosamente`,
        message_sent: messageSent,
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
