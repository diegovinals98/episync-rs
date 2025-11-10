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
    data: any = null
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
    const messages: ExpoPushMessage[] = validTokens.map((token) => {
      const message: ExpoPushMessage = {
        to: token,
        sound: "default",
        title,
        body,
        badge: 1,
        ...(subtitle && { subtitle }),
      };

      // Solo agregar data si no es null
      if (data !== null) {
        message.data = data;
      }

      return message;
    });

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
    addedByUserName: string = null
  ) {
    const title = "Nueva Serie!";
    const body = `${seriesName}: ${addedByUserName} ha añadido al grupo ${groupName}`;
    const data = {
      type: "series_added",
      groupName,
      seriesName,
      addedByUserName,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "", // Subtítulo vacío
      data
    );
  }

  // Notificación cuando se elimina serie
  async notifySeriesRemoved(
    groupName: string,
    seriesName: string,
    userTokens: string[],
    removedByUserName: string = null
  ) {
    const title = "Serie Eliminada!";
    const body = `${seriesName}: ${removedByUserName} ha eliminado del grupo ${groupName}`;
    const data = {
      type: "series_removed",
      groupName,
      seriesName,
      removedByUserName,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "", // Subtítulo vacío
      data
    );
  }

  // Notificación cuando se añade comentario
  async notifyCommentAdded(
    groupName: string,
    seriesName: string,
    userName: string,
    userTokens: string[],
    commentMessage?: string
  ) {
    const title = "Nuevo Comentario!";
    const body = commentMessage
      ? `${userName} - ${commentMessage}`
      : `${userName} comentó en ${seriesName}`;
    const subtitle = `${groupName}: ${seriesName}`;
    const data = {
      type: "comment_added",
      groupName,
      seriesName,
      userName,
      commentMessage,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      subtitle,
      data
    );
  }

  // Notificación cuando se marca episodio como visto
  async notifyEpisodeWatched(
    groupName: string,
    seriesName: string,
    episodeNumber: number,
    seasonNumber: number,
    userName: string,
    userTokens: string[],
    groupId?: number,
    seriesId?: number
  ) {
    const title = "Capitulo visto!";
    const body = `${userName}: Temporada ${seasonNumber}. Capitulo ${episodeNumber}`;
    const subtitle = `${groupName}: ${seriesName}`;
    const data = {
      type: "episode_watched",
      groupName,
      seriesName,
      episodeNumber,
      userName,
      timestamp: new Date().toISOString(),
      seriesId,
      groupId,
    };

    console.log("data push notification", data);

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      subtitle,
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
    adminUserName: string,
    userTokens: string[]
  ) {
    const title = "Grupo Nuevo!";
    const body = `${adminUserName} te ha añadido al grupo: ${groupName}`;
    const data = {
      type: "group_created",
      groupName,
      adminUserName,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "", // Subtítulo vacío
      data
    );
  }

  // Notificación cuando se añade un miembro al grupo
  async notifyMemberAdded(
    groupName: string,
    newMemberName: string,
    addedByUsername: string,
    userTokens: string[]
  ) {
    const title = "Nuevo miembro en el grupo";
    const body = `${addedByUsername} añadió a ${newMemberName} al grupo ${groupName}`;
    const data = {
      type: "member_added",
      groupName,
      newMemberName,
      addedByUsername,
      timestamp: new Date().toISOString(),
    };

    return this.sendPushNotificationToMultiple(
      userTokens,
      title,
      body,
      "Nuevo miembro",
      data
    );
  }
}
