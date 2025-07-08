import { Logger, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Repository } from "typeorm";
import { Comment } from "../groups/entities/comment.entity";
import { GroupActivity } from "../groups/entities/group-activity.entity";
import { GroupsService } from "../groups/groups.service";
import { NotificationHelperService } from "../notifications/notification-helper.service";
import { PushNotificationService } from "../notifications/push-notification.service";
import { EpisodesService } from "../series/episodes.service";
import { WebSocketAuthGuard } from "./websocket-auth.guard";

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  },
  namespace: "/",
})
export class WebSocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketsGateway.name);
  private connectedClients = new Map<
    string,
    { userId: number; groups: string[]; seriesRooms: string[] }
  >();

  constructor(
    private episodesService: EpisodesService,
    private jwtService: JwtService,
    private groupsService: GroupsService,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(GroupActivity)
    private groupActivityRepository: Repository<GroupActivity>,
    private pushNotificationService: PushNotificationService,
    private notificationHelperService: NotificationHelperService
  ) {}

  /**
   * Maneja la conexión de un cliente
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization;

      if (!token) {
        this.logger.warn("Cliente sin token intentó conectarse");
        client.disconnect();
        return;
      }

      // Verificar token (esto lo hace el guard en los métodos con @UseGuards)
      try {
        const payload = this.verifyToken(token);
        client.data = { user: payload };

        // Registrar cliente conectado
        this.connectedClients.set(client.id, {
          userId: payload.id,
          groups: [],
          seriesRooms: [],
        });

        this.logger.log(
          `Cliente conectado: ${client.id} (${payload.username})`
        );
        client.emit("connection-established", {
          message: "Conectado exitosamente",
        });
      } catch (error) {
        this.logger.warn(`Token inválido: ${error.message}`);
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(`Error en conexión: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Maneja la desconexión de un cliente
   */
  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);

    if (clientInfo) {
      // Salir de todos los grupos
      clientInfo.groups.forEach((groupId) => {
        client.leave(`group-${groupId}`);
      });

      this.connectedClients.delete(client.id);
      this.logger.log(`Cliente desconectado: ${clientInfo.userId}`);
    }
  }

  /**
   * Unirse a un grupo
   * Evento: 'join-group'
   * Payload: { groupId: number }
   */
  @SubscribeMessage("join-group")
  @UseGuards(WebSocketAuthGuard)
  async handleJoinGroup(
    @MessageBody() data: { groupId: number },
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user;
    const { groupId } = data;

    try {
      // Unirse al room del grupo
      await client.join(`group-${groupId}`);

      // Actualizar información del cliente
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo && !clientInfo.groups.includes(groupId.toString())) {
        clientInfo.groups.push(groupId.toString());
      }

      this.logger.log(`Usuario ${user.username} se unió al grupo ${groupId}`);

      // Notificar a otros miembros del grupo
      client.to(`group-${groupId}`).emit("user-joined-group", {
        userId: user.id,
        username: user.username,
        groupId,
        timestamp: new Date(),
      });

      // Confirmar al usuario
      client.emit("joined-group", {
        groupId,
        message: "Te has unido al grupo exitosamente",
      });
    } catch (error) {
      this.logger.error(`Error al unirse al grupo: ${error.message}`);
      client.emit("error", { message: "Error al unirse al grupo" });
    }
  }

  /**
   * Salir de un grupo
   * Evento: 'leave-group'
   * Payload: { groupId: number }
   */
  @SubscribeMessage("leave-group")
  @UseGuards(WebSocketAuthGuard)
  async handleLeaveGroup(
    @MessageBody() data: { groupId: number },
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user;
    const { groupId } = data;

    try {
      // Salir del room del grupo
      await client.leave(`group-${groupId}`);

      // Actualizar información del cliente
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.groups = clientInfo.groups.filter(
          (g) => g !== groupId.toString()
        );
      }

      this.logger.log(`Usuario ${user.username} salió del grupo ${groupId}`);

      // Notificar a otros miembros del grupo
      client.to(`group-${groupId}`).emit("user-left-group", {
        userId: user.id,
        username: user.username,
        groupId,
        timestamp: new Date(),
      });

      // Confirmar al usuario
      client.emit("left-group", {
        groupId,
        message: "Has salido del grupo",
      });
    } catch (error) {
      this.logger.error(`Error al salir del grupo: ${error.message}`);
      client.emit("error", { message: "Error al salir del grupo" });
    }
  }

  /**
   * Unirse a un room específico de grupo+serie
   * Evento: 'join-series-room'
   * Payload: { groupId: number, seriesId: number }
   */
  @SubscribeMessage("join-series-room")
  @UseGuards(WebSocketAuthGuard)
  async handleJoinSeriesRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user;
    const { roomId } = data;

    try {
      // Unirse al room específico grupo+serie
      await client.join(roomId);

      // Actualizar información del cliente
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        if (!clientInfo.seriesRooms) {
          clientInfo.seriesRooms = [];
        }
        if (!clientInfo.seriesRooms.includes(roomId)) {
          clientInfo.seriesRooms.push(roomId);
        }
      }

      this.logger.log(`Usuario ${user.username} se unió al room ${roomId}`);

      // Confirmar al usuario
      client.emit("joined-series-room", {
        roomId,
        message: "Te has unido al room de la serie exitosamente",
      });
    } catch (error) {
      this.logger.error(`Error al unirse al room de serie: ${error.message}`);
      client.emit("error", { message: "Error al unirse al room de serie" });
    }
  }

  /**
   * Salir de un room específico de grupo+serie
   * Evento: 'leave-series-room'
   * Payload: { groupId: number, seriesId: number }
   */
  @SubscribeMessage("leave-series-room")
  @UseGuards(WebSocketAuthGuard)
  async handleLeaveSeriesRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user;
    const { roomId } = data;

    try {
      // Salir del room específico grupo+serie
      await client.leave(roomId);

      // Actualizar información del cliente
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo && clientInfo.seriesRooms) {
        clientInfo.seriesRooms = clientInfo.seriesRooms.filter(
          (room) => room !== roomId
        );
      }

      this.logger.log(`Usuario ${user.username} salió del room ${roomId}`);

      // Confirmar al usuario
      client.emit("left-series-room", {
        roomId,
        message: "Has salido del room de la serie",
      });
    } catch (error) {
      this.logger.error(`Error al salir del room de serie: ${error.message}`);
      client.emit("error", { message: "Error al salir del room de serie" });
    }
  }

  /**
   * Toggle episodio visto/no visto
   * Evento: 'mark_episode_watched'
   * Payload: { roomId: number, episodeId: number, episodeNumber: number, seasonNumber: number, seriesId: number, userId: number, timestamp: string }
   */
  @SubscribeMessage("mark_episode_watched")
  @UseGuards(WebSocketAuthGuard)
  async handleMarkEpisodeWatched(
    @MessageBody()
    data: {
      roomId: number;
      episodeId: number;
      episodeNumber: number;
      seasonNumber: number;
      seriesId: number;
      userId: number;
      timestamp: string;
    },
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user;
    const { roomId, episodeId, episodeNumber, seasonNumber, seriesId } = data;

    // Asegurar que roomId sea un número válido
    const groupId = parseInt(roomId.toString().split("+")[0], 10);

    try {
      this.logger.log(
        `Usuario ${user.username} marcó episodio ${episodeId} (S${seasonNumber}E${episodeNumber}) como visto`
      );
      this.logger.log(
        `Datos recibidos: roomId=${roomId}, groupId=${groupId}, seriesId=${seriesId}, userId=${user.id}`
      );

      // Unir al cliente al room específico si no está ya unido
      const specificRoomId = `group-${groupId}+${seriesId}`;
      const clientInfo = this.connectedClients.get(client.id);

      if (
        clientInfo &&
        (!clientInfo.seriesRooms ||
          !clientInfo.seriesRooms.includes(specificRoomId))
      ) {
        await client.join(specificRoomId);

        if (!clientInfo.seriesRooms) {
          clientInfo.seriesRooms = [];
        }

        clientInfo.seriesRooms.push(specificRoomId);
        this.logger.log(
          `Usuario ${user.username} unido automáticamente al room ${specificRoomId}`
        );
      }

      // Guardar en la BD usando el servicio de episodios con datos proporcionados (toggle)
      const result = await this.episodesService.markEpisodeWatchedWithData(
        user.id,
        episodeId, // TMDB episode ID
        seriesId, // Internal series ID
        episodeNumber,
        seasonNumber,
        groupId
      );

      const isWatched = result.action === "watched";
      const actionText = isWatched ? "visto" : "no visto";

      // Notificar a todos los miembros del grupo
      this.server.to(`${roomId}`).emit("episode-toggled", {
        userId: user.id,
        username: user.username,
        groupId: groupId,
        seriesId,
        episodeId,
        episodeNumber,
        seasonNumber,
        watched: isWatched,
        timestamp: new Date(),
      });

      // Obtener el progreso de TODOS los miembros del grupo para esta serie
      const groupProgress = await this.getGroupSeriesProgress(
        groupId,
        seriesId
      );

      // Log para depuración
      this.logger.log(
        `Emitiendo series-progress-updated a room ${roomId}`,
        JSON.stringify(groupProgress)
      );

      // Emitir el progreso actualizado al room específico
      this.server.to(`${roomId}`).emit("series-progress-updated", {
        groupId,
        seriesId,
        timestamp: new Date(),
        data: groupProgress,
      });

      // Confirmar al usuario
      client.emit("episode-toggled-confirmed", {
        episodeId,
        episodeNumber,
        seasonNumber,
        watched: isWatched,
        message: `Episodio marcado como ${actionText}`,
      });

      // Enviar notificación push a todos los miembros del grupo (excepto al que marcó el episodio)
      if (isWatched) {
        try {
          const groupTokens =
            await this.notificationHelperService.getGroupMemberTokens(
              groupId,
              user.id
            );

          if (groupTokens.length > 0) {
            // Obtener información del grupo y la serie
            const group = await this.groupsService.getGroupById(
              groupId,
              user.id
            );
            const series = await this.episodesService.seriesRepository.findOne({
              where: { id: seriesId },
            });

            await this.pushNotificationService.notifyEpisodeWatched(
              group.name,
              series ? series.name : `Serie ${seriesId}`,
              episodeNumber,
              user.username,
              groupTokens
            );

            this.logger.log(
              `📱 Notificación push enviada a ${groupTokens.length} usuarios del grupo ${groupId}`
            );
          }
        } catch (notificationError) {
          this.logger.error(
            `Error enviando notificación push: ${notificationError.message}`
          );
        }
      }

      this.logger.log(
        `✅ Episodio ${episodeId} marcado como ${actionText} en grupo ${groupId}`
      );
    } catch (error) {
      this.logger.error(
        `Error al marcar episodio como visto: ${error.message}`
      );
      client.emit("error", { message: "Error al marcar episodio como visto" });
    }
  }

  /**
   * Obtener el progreso de todos los miembros de un grupo en una serie específica
   * Similar al endpoint getSeriesProgress
   */
  private async getGroupSeriesProgress(groupId: number, seriesId: number) {
    try {
      // Usar los repositorios públicos del servicio de episodios
      const groupMemberRepository = this.episodesService.groupMemberRepository;
      const userEpisodeRepository = this.episodesService.userEpisodeRepository;
      const seriesRepository = this.episodesService.seriesRepository;

      // Obtener la serie
      const series = await seriesRepository.findOne({
        where: { id: seriesId },
      });

      if (!series) {
        throw new Error("Serie no encontrada");
      }

      // Obtener todos los miembros del grupo
      const groupMembers = await groupMemberRepository.find({
        where: { group_id: groupId, is_active: true },
        relations: ["user"],
      });

      // Obtener el progreso de cada miembro
      const membersProgress = [];

      for (const member of groupMembers) {
        if (!member.user) continue; // Skip if user is null

        // Obtener episodios vistos por este usuario en esta serie
        const watchedEpisodes = await userEpisodeRepository.find({
          where: {
            user_id: member.user.id,
            series_id: seriesId,
            watched: true,
          },
          relations: ["episode"],
          order: { watched_at: "DESC" },
        });

        // Calcular estadísticas
        let highestSeason = 0;
        let highestEpisode = 0;
        const totalEpisodesWatched = watchedEpisodes.length;

        // Encontrar la temporada y episodio más alto vistos
        for (const watched of watchedEpisodes) {
          if (watched.episode) {
            if (watched.episode.season_number > highestSeason) {
              highestSeason = watched.episode.season_number;
              highestEpisode = watched.episode.episode_number;
            } else if (
              watched.episode.season_number === highestSeason &&
              watched.episode.episode_number > highestEpisode
            ) {
              highestEpisode = watched.episode.episode_number;
            }
          }
        }

        // Mapear los episodios vistos para incluirlos en la respuesta
        const episodesWatched = watchedEpisodes.map((ue) => ({
          episodeId: ue.episode.tmdb_id,
          episodeNumber: ue.episode.episode_number,
          seasonNumber: ue.episode.season_number,
          watched: ue.watched,
          watchedAt: ue.watched_at,
        }));

        membersProgress.push({
          user_id: member.user.id,
          username: member.user.username,
          full_name: `${member.user.name} ${member.user.lastname}`,
          highest_season: highestSeason,
          highest_episode: highestEpisode,
          total_episodes_watched: totalEpisodesWatched,
          episodes_watched: episodesWatched,
        });
      }

      return {
        series_id: seriesId,
        tmdb_id: series.tmdb_id,
        members_progress: membersProgress,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo progreso del grupo: ${error.message}`
      );
      return {
        series_id: seriesId,
        tmdb_id: 0,
        members_progress: [],
      };
    }
  }

  /**
   * Notificar nueva actividad en el grupo
   * Evento: 'group-activity'
   * Payload: { groupId: number, type: string, data: any }
   */
  @SubscribeMessage("group-activity")
  @UseGuards(WebSocketAuthGuard)
  async handleGroupActivity(
    @MessageBody() data: { groupId: number; type: string; data: any },
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user;
    const { groupId, type, data: activityData } = data;

    try {
      this.logger.log(`Nueva actividad en grupo ${groupId}: ${type}`);

      // Notificar a todos los miembros del grupo
      this.server.to(`group-${groupId}`).emit("group-activity", {
        userId: user.id,
        username: user.username,
        groupId,
        type,
        data: activityData,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Error al procesar actividad del grupo: ${error.message}`
      );
      client.emit("error", { message: "Error al procesar actividad" });
    }
  }

  /**
   * Método público para emitir eventos desde otros servicios
   * Ejemplo: this.websocketsGateway.emitToGroup(groupId, 'series-added', data)
   */
  emitToGroup(groupId: number, event: string, data: any) {
    this.server.to(`group-${groupId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Método público para emitir eventos a un usuario específico
   */
  emitToUser(userId: number, event: string, data: any) {
    // Encontrar el socket del usuario
    for (const [clientId, clientInfo] of this.connectedClients.entries()) {
      if (clientInfo.userId === userId) {
        this.server.to(clientId).emit(event, {
          ...data,
          timestamp: new Date(),
        });
        break;
      }
    }
  }

  /**
   * Obtener información de clientes conectados (para debugging)
   */
  getConnectedClients() {
    return Array.from(this.connectedClients.entries()).map(
      ([clientId, info]) => ({
        clientId,
        userId: info.userId,
        groups: info.groups,
        seriesRooms: info.seriesRooms,
      })
    );
  }

  /**
   * Verificar token JWT
   */
  private verifyToken(token: string) {
    // Eliminar el prefijo "Bearer " si existe
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new Error(`Token inválido: ${error.message}`);
    }
  }

  /**
   * Unirse a un room de grupo específico
   * Evento: 'join-group-room'
   * Payload: { groupId: string | number }
   */
  @SubscribeMessage("join-group-room")
  async handleJoinGroupRoom(
    @MessageBody() data: { groupId: string | number },
    @ConnectedSocket() client: Socket
  ) {
    const room = `${data.groupId}`;
    await client.join(room);
    this.logger.log(`Socket ${client.id} unido al room ${room}`);
    client.emit("joined-group-room", {
      roomId: room,
      message: "Te has unido al room del grupo",
    });
  }

  /**
   * Añadir una serie a un grupo vía socket
   * Evento: 'add_series_to_group'
   * Payload: { groupId: number, addSeriesDto: AddSeriesDto }
   */
  @SubscribeMessage("add_series_to_group")
  @UseGuards(WebSocketAuthGuard)
  async handleAddSeriesToGroup(
    @MessageBody() data: { groupId: number; roomId: string; addSeriesDto: any },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const user = client.data.user;
      const group_id = data.groupId;
      if (!user) {
        client.emit("error", { message: "No autenticado" });
        return;
      }
      // Usar el GroupsService para la lógica
      const result = await this.groupsService.addSeriesToGroup(
        group_id,
        user.id,
        data.addSeriesDto
      );
      this.server.to(`${data.roomId}`).emit("series-added-to-group", {
        success: true,
        message: "Serie añadida al grupo correctamente",
        data: result,
      });

      this.emitUpdatedNumberSeries(group_id);

      // Enviar notificación push a todos los miembros del grupo (excepto al que añadió)
      try {
        this.logger.log(
          `📱 Preparando notificación push para serie añadida al grupo ${group_id}`
        );

        const groupTokens =
          await this.notificationHelperService.getGroupMemberTokens(
            group_id,
            user.id
          );

        this.logger.log(
          `📱 Encontrados ${groupTokens.length} tokens para notificar en grupo ${group_id}`
        );

        if (groupTokens.length > 0) {
          const group = await this.groupsService.getGroupById(
            group_id,
            user.id
          );

          await this.pushNotificationService.notifySeriesAdded(
            group.name,
            data.addSeriesDto.name,
            groupTokens,
            user.username
          );

          this.logger.log(
            `📱 Notificación push enviada a ${groupTokens.length} usuarios del grupo ${group_id} por serie añadida: ${data.addSeriesDto.name}`
          );
        } else {
          this.logger.log(
            `⚠️ No se encontraron tokens de push para notificar en grupo ${group_id}`
          );
        }
      } catch (notificationError) {
        this.logger.error(
          `Error enviando notificación push: ${notificationError.message}`
        );
        this.logger.error(`Stack trace: ${notificationError.stack}`);
      }
    } catch (error) {
      this.server.to(`${data.roomId}`).emit("error", {
        message: error.message,
      });
    }
  }

  /**
   * Unirse a un room de usuario específico
   * Evento: 'join_user_room'
   * Payload: { userId: number | string }
   */
  @SubscribeMessage("join_user_room")
  async handleJoinUserRoom(
    @MessageBody() data: { userId: number | string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `${data.userId}`;
    await client.join(room);
    this.logger.log(`Socket ${client.id} unido al room de usuario ${room}`);
    client.emit("joined-user-room", {
      roomId: room,
      message: "Te has unido al room del usuario",
    });
  }

  /**
   * Unirse a un room de comentarios de una serie en un grupo
   * Evento: 'join_comments_room'
   * Payload: { groupId: number | string, seriesId: number | string }
   */
  @SubscribeMessage("join_comments_room")
  async handleJoinCommentsRoom(
    @MessageBody()
    data: { groupId: number | string; seriesId: number | string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `comentarios_${data.groupId}_${data.seriesId}`;
    await client.join(room);
    this.logger.log(`Socket ${client.id} unido al room de comentarios ${room}`);
    client.emit("joined-comments-room", {
      roomId: room,
      message: "Te has unido al room de comentarios",
    });
  }

  /**
   * Salir de un room de comentarios de una serie en un grupo
   * Evento: 'leave_comments_room'
   * Payload: { groupId: number | string, seriesId: number | string }
   */
  @SubscribeMessage("leave_comments_room")
  async handleLeaveCommentsRoom(
    @MessageBody()
    data: { groupId: number | string; seriesId: number | string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `comentarios_${data.groupId}_${data.seriesId}`;
    await client.leave(room);
    this.logger.log(
      `Socket ${client.id} salió del room de comentarios ${room}`
    );
    client.emit("left-comments-room", {
      roomId: room,
      message: "Has salido del room de comentarios",
    });
  }

  /**
   * Emitir a cada usuario del grupo el número actualizado de series
   */
  async emitUpdatedNumberSeries(groupId: number) {
    // Obtener miembros activos del grupo
    const groupMembers = await this.episodesService.groupMemberRepository.find({
      where: { group_id: groupId, is_active: true },
      relations: ["user"],
    });
    // Contar series activas usando GroupsService
    const seriesCount = await this.groupsService["groupSeriesRepository"].count(
      {
        where: { group_id: groupId, is_active: true },
      }
    );
    // Emitir a cada usuario
    for (const member of groupMembers) {
      if (member.user_id) {
        this.server.to(`${member.user_id}`).emit("updated-number-series", {
          groupId,
          seriesCount,
        });
      }
    }
  }

  /**
   * Añadir un comentario y emitirlo al room de comentarios
   * Evento: 'add_comment'
   * Payload: { groupId, seriesId, message, token, replyTo }
   */
  @SubscribeMessage("add_comment")
  async handleAddComment(
    @MessageBody()
    data: {
      groupId: number | string;
      seriesId: number | string;
      message: string;
      token: string;
      replyTo?: number | null;
    },
    @ConnectedSocket() client: Socket
  ) {
    try {
      // Decodificar el token para obtener el id de usuario
      let userId: number | null = null;
      let username = "";
      let name = "";
      let lastname = "";
      if (data.token) {
        const token = data.token.startsWith("Bearer ")
          ? data.token.slice(7)
          : data.token;
        const payload: any = this.jwtService.decode(token);
        userId = payload?.id;
        username = payload?.username || "";
        name = payload?.name || "";
        lastname = payload?.lastname || "";
      }
      const room = `comentarios_${data.groupId}_${data.seriesId}`;
      // Guardar el comentario en la base de datos
      const comment = this.commentRepository.create({
        group_id: Number(data.groupId),
        series_id: Number(data.seriesId),
        user_id: userId,
        message: data.message,
        reply_to: data.replyTo || null,
      });
      const saved = await this.commentRepository.save(comment);
      // Guardar actividad en el grupo
      let seriesName = null;
      try {
        const seriesRepo = this.episodesService.seriesRepository;
        const series = await seriesRepo.findOne({
          where: { id: Number(data.seriesId) },
        });
        seriesName = series ? series.name : null;
      } catch {}
      await this.groupActivityRepository.save({
        group_id: Number(data.groupId),
        user_id: userId,
        type: "comment_added",
        series_id: Number(data.seriesId),
        series_name: seriesName,
        comment: data.message,
        created_at: saved.created_at,
      });
      // Emitir el comentario al room
      this.server.to(room).emit("new_comment", {
        id: saved.id,
        groupId: data.groupId,
        seriesId: data.seriesId,
        message: data.message,
        replyTo: data.replyTo || null,
        userId,
        username,
        name,
        lastname,
        timestamp: saved.created_at,
      });

      // Enviar notificación push a todos los miembros del grupo (excepto al que comentó)
      try {
        this.logger.log(
          `📱 Preparando notificación push para comentario en grupo ${data.groupId}`
        );

        const groupTokens =
          await this.notificationHelperService.getGroupMemberTokens(
            Number(data.groupId),
            userId
          );

        this.logger.log(
          `📱 Encontrados ${groupTokens.length} tokens para notificar en grupo ${data.groupId}`
        );

        if (groupTokens.length > 0) {
          // Obtener información del grupo y la serie
          const group = await this.groupsService.getGroupById(
            Number(data.groupId),
            userId
          );
          const series = await this.episodesService.seriesRepository.findOne({
            where: { id: Number(data.seriesId) },
          });

          await this.pushNotificationService.notifyCommentAdded(
            group.name,
            series ? series.name : `Serie ${data.seriesId}`,
            username,
            groupTokens
          );

          this.logger.log(
            `📱 Notificación push enviada a ${groupTokens.length} usuarios del grupo ${data.groupId} por comentario de: ${username}`
          );
        } else {
          this.logger.log(
            `⚠️ No se encontraron tokens de push para notificar en grupo ${data.groupId}`
          );
        }
      } catch (notificationError) {
        this.logger.error(
          `Error enviando notificación push: ${notificationError.message}`
        );
        this.logger.error(`Stack trace: ${notificationError.stack}`);
      }
    } catch (error) {
      client.emit("error", { message: "Error al procesar el comentario" });
    }
  }
}
