import { Injectable, Logger } from "@nestjs/common";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

@Injectable()
export class PushNotificationService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(PushNotificationService.name);

  // Enviar a múltiples dispositivos
  async sendPushNotificationToMultiple(
    tokens: string[],
    title: string,
    body: string,
    subtitle: string = "",
    data: any = {}
  ) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    // Filtrar tokens válidos
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      this.logger.warn("No hay tokens válidos para enviar notificaciones");
      return { success: false, error: "No hay tokens válidos" };
    }

    // Crear mensajes
    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      badge: 1,
      data,
      ...(subtitle && { subtitle }),
    }));

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (let chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      const sent = tickets.filter((ticket) => ticket.status === "ok").length;
      const failed = tickets.filter(
        (ticket) => ticket.status === "error"
      ).length;

      this.logger.log(
        `Notificaciones enviadas: ${sent} exitosas, ${failed} fallidas`
      );
      return { success: true, sent, failed };
    } catch (error) {
      this.logger.error(`Error enviando notificaciones: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Notificación cuando se añade serie
  async notifySeriesAdded(
    groupName: string,
    seriesName: string,
    userTokens: string[],
    addedByUser: string = null
  ) {
    const title = "Nueva serie añadida";
    const body = `${seriesName} se añadió al grupo ${groupName}`;
    const data = {
      type: "series_added",
      groupName,
      seriesName,
      addedByUser,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "Serie añadida al grupo",
      data
    );
  }

  // Notificación cuando se añade comentario
  async notifyCommentAdded(
    groupName: string,
    seriesName: string,
    username: string,
    userTokens: string[]
  ) {
    const title = "Nuevo comentario";
    const body = `${username} comentó en ${seriesName}`;
    const data = {
      type: "comment_added",
      groupName,
      seriesName,
      username,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "Comentario en serie",
      data
    );
  }

  // Notificación cuando se marca episodio como visto
  async notifyEpisodeWatched(
    groupName: string,
    seriesName: string,
    episodeNumber: number,
    username: string,
    userTokens: string[]
  ) {
    const title = "Episodio marcado como visto";
    const body = `${username} marcó el episodio ${episodeNumber} de ${seriesName} como visto`;
    const data = {
      type: "episode_watched",
      groupName,
      seriesName,
      episodeNumber,
      username,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "Progreso actualizado",
      data
    );
  }

  // Notificación de actividad general en el grupo
  async notifyGroupActivity(
    groupName: string,
    activityType: string,
    description: string,
    userTokens: string[]
  ) {
    const title = `Actividad en ${groupName}`;
    const body = description;
    const data = {
      type: "group_activity",
      groupName,
      activityType,
      description,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "Nueva actividad",
      data
    );
  }

  // Notificación cuando se crea un nuevo grupo
  async notifyGroupCreated(
    groupName: string,
    adminUsername: string,
    userTokens: string[]
  ) {
    const title = "Nuevo grupo creado";
    const body = `${adminUsername} te invitó al grupo ${groupName}`;
    const data = {
      type: "group_created",
      groupName,
      adminUsername,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "Invitación a grupo",
      data
    );
  }
}
