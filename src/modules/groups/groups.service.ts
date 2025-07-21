import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationHelperService } from "../notifications/notification-helper.service";
import { PushNotificationService } from "../notifications/push-notification.service";
import { Series } from "../series/entities/series.entity";
import { UserEpisode } from "../series/entities/user-episode.entity";
import { TmdbService } from "../series/tmdb.service";
import { UsersService } from "../users/users.service";
import { WebSocketsGateway } from "../websockets/websockets.gateway";
import { AddSeriesDto } from "./dto/add-series.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { GroupActivity } from "./entities/group-activity.entity";
import { GroupMember } from "./entities/group-member.entity";
import { GroupSeries } from "./entities/group-series.entity";
import { Group } from "./entities/group.entity";

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(GroupSeries)
    private groupSeriesRepository: Repository<GroupSeries>,
    @InjectRepository(GroupActivity)
    private groupActivityRepository: Repository<GroupActivity>,
    @InjectRepository(Series)
    private seriesRepository: Repository<Series>,
    private usersService: UsersService,
    @Inject(forwardRef(() => WebSocketsGateway))
    private websocketsGateway: WebSocketsGateway,
    @InjectRepository(UserEpisode)
    private userEpisodeRepository: Repository<UserEpisode>,
    private notificationHelperService: NotificationHelperService,
    private pushNotificationService: PushNotificationService,
    private tmdbService: TmdbService
  ) {}

  async getUserGroups(userId: number) {
    // Obtener los grupos donde el usuario es miembro
    const groupMembers = await this.groupMemberRepository.find({
      where: { user_id: userId, is_active: true },
      relations: ["group"],
    });

    const groups = [];

    // Para cada grupo, obtener información detallada
    for (const membership of groupMembers) {
      const group = membership.group;

      // Debug: Consulta SQL raw para verificar los datos
      const rawGroup = await this.groupRepository.query(
        "SELECT id, name, description, image_url, created_at FROM groups WHERE id = ?",
        [group.id]
      );

      console.log(`Raw group data for ID ${group.id}:`, rawGroup[0]);

      // Hacer una consulta directa al grupo para asegurar que tenemos todos los datos
      const fullGroup = await this.groupRepository.findOne({
        where: { id: group.id },
      });

      console.log(`TypeORM group data for ID ${group.id}:`, {
        id: fullGroup.id,
        name: fullGroup.name,
        image_url: fullGroup.image_url,
      });

      // Contar miembros activos
      const memberCount = await this.groupMemberRepository.count({
        where: { group_id: group.id, is_active: true },
      });

      // Contar series activas
      const seriesCount = await this.groupSeriesRepository.count({
        where: { group_id: group.id, is_active: true },
      });

      // Verificar si el usuario es admin del grupo
      const isAdmin = membership.role === "admin";

      // Obtener los miembros del grupo (limitado a 5)
      const members = await this.groupMemberRepository.find({
        where: { group_id: group.id, is_active: true },
        relations: ["user"],
        take: 5,
      });

      // Formatear los miembros (con validación para usuarios null)
      const formattedMembers = members
        .filter((member) => member.user !== null) // Filtrar miembros sin usuario
        .map((member) => ({
          id: member.user.id,
          username: member.user.username,
          name: member.user.name,
          lastname: member.user.lastname,
          avatar_url: member.user.avatar_url,
          role: member.role,
        }));

      // Obtener actividad reciente (últimas 5 actividades)
      const recentActivity = await this.groupActivityRepository.find({
        where: { group_id: group.id },
        relations: ["user"],
        order: { created_at: "DESC" },
        take: 5,
      });

      // Formatear la actividad reciente (con validación para usuarios null)
      const formattedActivity = recentActivity
        .filter((activity) => activity.user !== null) // Filtrar actividades sin usuario
        .map((activity) => {
          const base = {
            id: activity.id,
            type: activity.type,
            user_id: activity.user_id,
            username: activity.user.username,
            name: activity.user.name,
            series_id: activity.series_id,
            series_name: activity.series_name,
            episode_id: activity.episode_id,
            episode_name: activity.episode_name,
            created_at: activity.created_at,
          };
          if (activity.type === "comment_added") {
            return { ...base, comment: activity.comment };
          }
          return base;
        });

      // Obtener la última actividad para determinar last_activity
      const lastActivity =
        recentActivity.length > 0
          ? recentActivity[0].created_at
          : group.created_at;

      // Añadir el grupo formateado al resultado
      const groupData = {
        id: fullGroup.id,
        name: fullGroup.name,
        description: fullGroup.description,
        image_url: fullGroup.image_url,
        created_at: fullGroup.created_at,
        member_count: memberCount,
        is_admin: isAdmin,
        series_count: seriesCount,
        last_activity: lastActivity,
        members: formattedMembers,
        recent_activity: formattedActivity,
      };

      groups.push(groupData);
    }

    // Ordenar grupos por actividad más reciente
    groups.sort(
      (a, b) =>
        new Date(b.last_activity).getTime() -
        new Date(a.last_activity).getTime()
    );

    return groups;
  }

  async createGroup(adminId: number, createGroupDto: CreateGroupDto) {
    const { name, description, members = [], image_url } = createGroupDto;

    // Crear el grupo
    const group = this.groupRepository.create({
      name,
      description,
      image_url,
    });

    const savedGroup = await this.groupRepository.save(group);

    // Agregar el admin como miembro del grupo
    await this.groupMemberRepository.save({
      user_id: adminId,
      group_id: savedGroup.id,
      role: "admin",
      is_active: true,
    });

    // Agregar los miembros especificados
    const memberPromises = members.map((memberId) =>
      this.groupMemberRepository.save({
        user_id: memberId,
        group_id: savedGroup.id,
        role: "member",
        is_active: true,
      })
    );

    await Promise.all(memberPromises);

    // Obtener información completa del grupo creado
    const groupWithDetails = await this.getGroupDetails(savedGroup.id);

    // Enviar notificación push a todos los miembros del grupo (excepto al admin)
    try {
      console.log(
        `📱 Preparando notificación push para grupo creado: ${savedGroup.name}`
      );

      // Obtener tokens de todos los miembros excepto el admin
      const memberTokens =
        await this.notificationHelperService.getGroupMemberTokens(
          savedGroup.id,
          adminId
        );

      console.log(
        `📱 Encontrados ${memberTokens.length} tokens para notificar en grupo ${savedGroup.name}`
      );

      if (memberTokens.length > 0) {
        // Obtener información del admin
        const admin = await this.usersService.findById(adminId);

        await this.pushNotificationService.notifyGroupCreated(
          savedGroup.name,
          admin?.username || "Usuario",
          memberTokens
        );

        console.log(
          `📱 Notificación push enviada a ${memberTokens.length} usuarios por grupo creado: ${savedGroup.name}`
        );
      } else {
        console.log(
          `⚠️ No se encontraron tokens de push para notificar en grupo ${savedGroup.name}`
        );
      }
    } catch (notificationError) {
      console.error("Error enviando notificación push:", notificationError);
    }

    return {
      id: savedGroup.id,
      name: savedGroup.name,
      description: savedGroup.description,
      image_url: savedGroup.image_url,
      admin_id: adminId,
      created_at: savedGroup.created_at,
      updated_at: savedGroup.updated_at,
      members: groupWithDetails.members,
      member_count: groupWithDetails.member_count,
      series_count: groupWithDetails.series_count,
    };
  }

  async getGroupDetails(groupId: number) {
    // Contar miembros activos
    const memberCount = await this.groupMemberRepository.count({
      where: { group_id: groupId, is_active: true },
    });

    // Contar series activas
    const seriesCount = await this.groupSeriesRepository.count({
      where: { group_id: groupId, is_active: true },
    });

    // Obtener los miembros del grupo
    const members = await this.groupMemberRepository.find({
      where: { group_id: groupId, is_active: true },
      relations: ["user"],
    });

    // Formatear los miembros (con validación para usuarios null)
    const formattedMembers = members
      .filter((member) => member.user !== null) // Filtrar miembros sin usuario
      .map((member) => ({
        id: member.user.id,
        username: member.user.username,
        name: member.user.name,
        lastname: member.user.lastname,
        role: member.role,
      }));

    return {
      member_count: memberCount,
      series_count: seriesCount,
      members: formattedMembers,
    };
  }

  async getGroupById(groupId: number, userId: number) {
    // Verificar que el usuario es miembro del grupo
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (!membership) {
      throw new NotFoundException("Grupo no encontrado o no tienes acceso");
    }

    // Obtener información del grupo
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException("Grupo no encontrado");
    }

    // Contar miembros activos
    const memberCount = await this.groupMemberRepository.count({
      where: { group_id: groupId, is_active: true },
    });

    // Contar series activas
    const seriesCount = await this.groupSeriesRepository.count({
      where: { group_id: groupId, is_active: true },
    });

    // Verificar si el usuario es admin
    const isAdmin = membership.role === "admin";

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      photo_url: group.image_url,
      is_admin: isAdmin,
      member_count: memberCount,
      series_count: seriesCount,
      created_at: group.created_at,
      updated_at: group.updated_at,
    };
  }

  async getGroupSeries(groupId: number, userId: number) {
    // Verificar que el usuario es miembro del grupo
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (!membership) {
      throw new NotFoundException("Grupo no encontrado o no tienes acceso");
    }

    // Obtener series del grupo con información de la serie
    const groupSeries = await this.groupSeriesRepository.find({
      where: { group_id: groupId, is_active: true },
      relations: ["series"],
      order: { added_at: "DESC" },
    });

    // Formatear las series
    const formattedSeries = groupSeries.map((gs) => {
      const series = gs.series;
      return {
        id: series.id, // ID interno de la BD
        tmdb_id: series.tmdb_id, // ID de TMDB
        name: series.name,
        poster_url: series.poster_path
          ? `https://image.tmdb.org/t/p/w500${series.poster_path}`
          : null,
        episodes_count: series.number_of_episodes || 0,
        status: series.first_air_date ? "Ongoing" : "Unknown",
        last_episode: series.number_of_seasons
          ? `S${series.number_of_seasons}E${series.number_of_episodes || 0}`
          : "Unknown",
        added_at: gs.added_at,
      };
    });

    return formattedSeries;
  }

  async getGroupMembers(groupId: number, userId: number) {
    // Verificar que el usuario es miembro del grupo
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (!membership) {
      throw new NotFoundException("Grupo no encontrado o no tienes acceso");
    }

    // Obtener miembros del grupo con información del usuario
    const members = await this.groupMemberRepository.find({
      where: { group_id: groupId, is_active: true },
      relations: ["user"],
      order: { joined_at: "ASC" },
    });

    // Formatear los miembros
    const formattedMembers = members
      .filter((member) => member.user !== null)
      .map((member) => {
        const user = member.user;
        const isAdmin = member.role === "admin";

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          full_name: `${user.name} ${user.lastname}`,
          avatar_url: user.avatar_url,
          is_admin: isAdmin,
          series_watching: 0, // TODO: Implementar contador de series que está viendo
          episodes_watched: 0, // TODO: Implementar contador de episodios vistos
          joined_at: member.joined_at,
        };
      });

    return formattedMembers;
  }

  async addSeriesToGroup(
    groupId: number,
    userId: number,
    addSeriesDto: AddSeriesDto
  ) {
    const {
      tmdb_id,
      name,
      overview,
      poster_path,
      poster_url,
      backdrop_path,
      first_air_date,
      vote_average,
      vote_count,
      popularity,
      added_by_user_id,
    } = addSeriesDto;

    // Verificar que el usuario es miembro del grupo
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (!membership) {
      throw new NotFoundException("Grupo no encontrado o no tienes acceso");
    }

    // Buscar si la serie ya existe en la tabla series usando el tmdb_id
    let series = await this.seriesRepository.findOne({
      where: { tmdb_id: tmdb_id },
    });

    // Si no existe, la creamos en la tabla series con los datos recibidos
    if (!series) {
      // Extraer poster_path de poster_url si no se proporciona poster_path
      let finalPosterPath = poster_path;
      if (!poster_path && poster_url) {
        // Extraer la ruta del poster de la URL completa
        const urlParts = poster_url.split("/");
        finalPosterPath = "/" + urlParts[urlParts.length - 1];
      }

      series = this.seriesRepository.create({
        tmdb_id: tmdb_id,
        name: name,
        overview: overview,
        poster_path: finalPosterPath,
        backdrop_path: backdrop_path,
        first_air_date: first_air_date ? new Date(first_air_date) : null,
        number_of_seasons:
          typeof addSeriesDto.number_of_seasons !== "undefined"
            ? addSeriesDto.number_of_seasons
            : null,
        number_of_episodes:
          typeof addSeriesDto.number_of_episodes !== "undefined"
            ? addSeriesDto.number_of_episodes
            : null,
        genres: addSeriesDto.genres
          ? typeof addSeriesDto.genres === "string"
            ? JSON.parse(addSeriesDto.genres)
            : addSeriesDto.genres
          : null,
        vote_average: vote_average || 0,
        vote_count: vote_count || 0,
        is_popular:
          typeof addSeriesDto.is_popular !== "undefined"
            ? Boolean(addSeriesDto.is_popular)
            : false,
        created_at: addSeriesDto.created_at
          ? new Date(addSeriesDto.created_at)
          : undefined,
        updated_at: addSeriesDto.updated_at
          ? new Date(addSeriesDto.updated_at)
          : undefined,
        popularity: popularity || 0,
      });
      await this.seriesRepository.save(series);
    }

    // Verificar que la serie no esté ya en el grupo
    const existingGroupSeries = await this.groupSeriesRepository.findOne({
      where: { group_id: groupId, series_id: series.id, is_active: true },
    });

    if (existingGroupSeries) {
      throw new NotFoundException("La serie ya está en el grupo");
    }

    // Crear una relación en la tabla group_series
    const groupSeries = this.groupSeriesRepository.create({
      group_id: groupId,
      series_id: series.id,
      added_by_user_id: added_by_user_id || userId,
      is_active: true,
    });

    await this.groupSeriesRepository.save(groupSeries);

    // Registrar actividad
    await this.groupActivityRepository.save({
      group_id: groupId,
      user_id: userId,
      type: "series_added",
      series_id: series.id,
      series_name: series.name,
    });

    // Obtener información del usuario que añadió la serie
    const user = await this.usersService.findById(userId);

    // Emitir evento WebSocket a todos los miembros del grupo
    this.websocketsGateway.emitToGroup(groupId, "series-added", {
      seriesId: series.tmdb_id,
      seriesName: series.name,
      addedBy: {
        userId: userId,
        username: user?.username || "Usuario",
        name: user?.name || "Usuario",
      },
      addedAt: groupSeries.added_at,
    });

    // Emitir a cada usuario el número actualizado de series
    const groupMembers = await this.groupMemberRepository.find({
      where: { group_id: groupId, is_active: true },
      relations: ["user"],
    });
    const seriesCount = await this.groupSeriesRepository.count({
      where: { group_id: groupId, is_active: true },
    });
    for (const member of groupMembers) {
      if (member.user) {
        this.websocketsGateway.emitToUser(
          member.user.id,
          "updated-number-series",
          {
            groupId,
            seriesCount,
          }
        );
      }
    }

    return {
      id: groupSeries.id,
      series_id: series.id, // ID interno de la BD
      tmdb_id: series.tmdb_id, // ID de TMDB
      series_name: series.name,
      added_at: groupSeries.added_at,
      number_of_episodes: series.number_of_episodes || 0,
    };
  }

  /**
   * Obtener progreso de los miembros de un grupo en una serie específica
   */
  async getSeriesProgress(groupId: number, seriesId: number, userId: number) {
    // Verificar que el usuario es miembro del grupo
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (!membership) {
      throw new NotFoundException("Grupo no encontrado o no tienes acceso");
    }

    // Verificar que la serie existe en el grupo
    const groupSeries = await this.groupSeriesRepository.findOne({
      where: { group_id: groupId, series_id: seriesId, is_active: true },
      relations: ["series"],
    });

    if (!groupSeries) {
      throw new NotFoundException("Serie no encontrada en el grupo");
    }

    // Obtener todos los miembros del grupo
    const groupMembers = await this.groupMemberRepository.find({
      where: { group_id: groupId, is_active: true },
      relations: ["user"],
    });

    // Obtener el progreso de cada miembro
    const membersProgress = [];

    for (const member of groupMembers) {
      if (!member.user) continue; // Skip if user is null

      // Obtener episodios vistos por este usuario en esta serie
      const watchedEpisodes = await this.userEpisodeRepository.find({
        where: {
          user_id: member.user.id,
          series_id: groupSeries.series.id, // Usar el ID interno, no el tmdb_id
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

      membersProgress.push({
        user_id: member.user.id,
        username: member.user.username,
        full_name: `${member.user.name} ${member.user.lastname}`,
        highest_season: highestSeason,
        highest_episode: highestEpisode,
        total_episodes_watched: totalEpisodesWatched,
      });
    }

    return {
      series_id: seriesId,
      tmdb_id: groupSeries.series.tmdb_id,
      members_progress: membersProgress,
    };
  }

  /**
   * Añadir un miembro a un grupo
   */
  async addMemberToGroup(
    groupId: number,
    userId: number,
    addedByUserId: number
  ) {
    // Verificar que el usuario que añade es admin del grupo
    const adminMembership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: addedByUserId, is_active: true },
    });

    if (!adminMembership || adminMembership.role !== "admin") {
      throw new NotFoundException(
        "Solo los administradores pueden añadir miembros"
      );
    }

    // Verificar que el usuario no esté ya en el grupo
    const existingMembership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (existingMembership) {
      throw new NotFoundException("El usuario ya es miembro del grupo");
    }

    // Verificar que el usuario existe
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Verificar que el grupo existe
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException("Grupo no encontrado");
    }

    // Añadir el usuario al grupo
    const newMembership = this.groupMemberRepository.create({
      user_id: userId,
      group_id: groupId,
      role: "member",
      is_active: true,
    });

    await this.groupMemberRepository.save(newMembership);

    // Registrar actividad
    await this.groupActivityRepository.save({
      group_id: groupId,
      user_id: userId, // <-- El usuario que fue añadido
      type: "member_added",
      series_id: null,
      series_name: null,
    });

    // Obtener información del usuario que añadió
    const addedByUser = await this.usersService.findById(addedByUserId);

    // Obtener estadísticas del usuario
    const userStats = await this.getUserStats(userId);

    return {
      success: true,
      message: "Usuario añadido exitosamente al grupo",
      data: {
        user_id: user.id,
        username: user.username,
        name: user.name,
        lastname: user.lastname,
        full_name: `${user.name} ${user.lastname}`,
        avatar_url: user.avatar_url,
        email: user.email,
        is_admin: false,
        joined_at: newMembership.joined_at,
        series_count: userStats.seriesCount,
        episodes_watched: userStats.episodesWatched,
      },
      group_id: groupId,
      added_by: addedByUser?.username || "Usuario",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtener estadísticas de un usuario
   */
  private async getUserStats(userId: number) {
    // Contar series que está viendo
    const seriesCount = await this.userEpisodeRepository
      .createQueryBuilder("ue")
      .select("ue.series_id")
      .where("ue.user_id = :userId", { userId })
      .andWhere("ue.watched = :watched", { watched: true })
      .distinct()
      .getCount();

    // Contar episodios vistos
    const episodesWatched = await this.userEpisodeRepository.count({
      where: { user_id: userId, watched: true },
    });

    return {
      seriesCount,
      episodesWatched,
    };
  }

  /**
   * Obtener episodios vistos de una temporada específica por un usuario
   */
  async getSeasonEpisodesWatched(
    groupId: number,
    seriesId: number,
    seasonNumber: number,
    userId: number
  ) {
    // Verificar que el usuario es miembro del grupo
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (!membership) {
      throw new NotFoundException("Grupo no encontrado o no tienes acceso");
    }

    // Verificar que la serie existe en el grupo
    const groupSeries = await this.groupSeriesRepository.findOne({
      where: { group_id: groupId, series_id: seriesId, is_active: true },
    });

    if (!groupSeries) {
      throw new NotFoundException("Serie no encontrada en el grupo");
    }

    // Obtener episodios vistos por el usuario en esta serie y temporada
    const watchedEpisodes = await this.userEpisodeRepository.find({
      where: {
        user_id: userId,
        series_id: seriesId,
        watched: true,
      },
      relations: ["episode"],
      order: { watched_at: "ASC" },
    });

    // Filtrar episodios de la temporada específica
    const seasonEpisodesWatched = watchedEpisodes
      .filter((userEpisode) => {
        return (
          userEpisode.episode &&
          userEpisode.episode.season_number === seasonNumber
        );
      })
      .map((userEpisode) => ({
        episode_id: userEpisode.episode.tmdb_id,
        episode_number: userEpisode.episode.episode_number,
        season_number: userEpisode.episode.season_number,
        watched_at: userEpisode.watched_at,
      }));

    return {
      series_id: seriesId,
      season_number: seasonNumber,
      episodes_watched: seasonEpisodesWatched,
    };
  }

  /**
   * Eliminar una serie de un grupo
   */
  async removeSeriesFromGroup(
    groupId: number,
    seriesId: number,
    userId: number
  ) {
    // Verificar que el usuario es miembro del grupo
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (!membership) {
      throw new NotFoundException("Grupo no encontrado o no tienes acceso");
    }

    // Verificar que la serie existe en el grupo
    const groupSeries = await this.groupSeriesRepository.findOne({
      where: { group_id: groupId, series_id: seriesId, is_active: true },
      relations: ["series"],
    });

    if (!groupSeries) {
      throw new NotFoundException("Serie no encontrada en el grupo");
    }

    // Obtener información de la serie antes de eliminarla
    const series = groupSeries.series;

    // Marcar la serie como inactiva en el grupo (soft delete)
    groupSeries.is_active = false;
    await this.groupSeriesRepository.save(groupSeries);

    // Registrar actividad
    await this.groupActivityRepository.save({
      group_id: groupId,
      user_id: userId,
      type: "series_removed",
      series_id: seriesId,
      series_name: series.name,
    });

    // Obtener información del usuario que eliminó la serie
    const user = await this.usersService.findById(userId);

    return {
      success: true,
      message: "Serie eliminada del grupo correctamente",
      data: {
        series_id: seriesId,
        tmdb_id: series.tmdb_id,
        series_name: series.name,
        removed_by: {
          userId: userId,
          username: user?.username || "Usuario",
          name: user?.name || "Usuario",
        },
        removed_at: new Date(),
      },
    };
  }

  async updateGroupImage(groupId: number, imageUrl: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException("Grupo no encontrado");
    }

    // Si ya tiene una imagen, eliminarla de S3
    if (group.image_url) {
      // Aquí podrías llamar al servicio S3 para eliminar la imagen anterior
      // Por ahora solo actualizamos la URL
    }

    // Actualizar la URL de la imagen del grupo
    await this.groupRepository.update(groupId, {
      image_url: imageUrl,
    });

    // Retornar el grupo actualizado
    return this.groupRepository.findOne({
      where: { id: groupId },
    });
  }

  /**
   * Obtener próximos episodios de las series que el usuario está viendo en todos sus grupos
   */
  async getUserUpcomingEpisodes(userId: number) {
    // Obtener todos los grupos donde el usuario es miembro
    const userGroups = await this.groupMemberRepository.find({
      where: { user_id: userId, is_active: true },
      relations: ["group"],
    });

    const seriesWithEpisodes = [];

    // Para cada grupo, obtener las series y sus próximos episodios
    for (const membership of userGroups) {
      const group = membership.group;

      // Obtener series del grupo
      const groupSeries = await this.groupSeriesRepository.find({
        where: { group_id: group.id, is_active: true },
        relations: ["series"],
      });

      // Para cada serie, obtener todos los episodios futuros
      for (const groupSeriesItem of groupSeries) {
        const series = groupSeriesItem.series;

        try {
          // Obtener detalles de la serie desde TMDB
          const seriesDetails = await this.tmdbService.getSeriesDetails(
            series.tmdb_id
          );

          const upcomingEpisodes = [];
          const today = new Date();

          // Usar next_episode_to_air si está disponible
          if (
            seriesDetails.next_episode_to_air &&
            seriesDetails.next_episode_to_air.air_date
          ) {
            const nextEpisode = seriesDetails.next_episode_to_air;
            const airDate = new Date(nextEpisode.air_date);

            if (airDate >= today) {
              upcomingEpisodes.push({
                id: nextEpisode.id,
                name: nextEpisode.name,
                air_date: nextEpisode.air_date,
                episode_number: nextEpisode.episode_number,
                season_number: nextEpisode.season_number,
                overview: nextEpisode.overview || "",
                still_path: nextEpisode.still_path,
                vote_average: nextEpisode.vote_average || 0,
                vote_count: nextEpisode.vote_count || 0,
                runtime: nextEpisode.runtime || null,
                episode_type: nextEpisode.episode_type || "standard",
              });
            }
          }

          // Si no hay next_episode_to_air o está vacío, buscar en temporadas futuras
          if (upcomingEpisodes.length === 0) {
            const numberOfSeasons = seriesDetails.number_of_seasons || 1;

            for (
              let season = 1;
              season <= Math.min(numberOfSeasons, 20);
              season++
            ) {
              try {
                const seasonData = await this.tmdbService.getSeriesSeasons(
                  series.tmdb_id,
                  season
                );

                if (
                  seasonData &&
                  seasonData.episodes &&
                  seasonData.episodes.length > 0
                ) {
                  // Filtrar episodios futuros de esta temporada
                  const futureEpisodesInSeason = seasonData.episodes
                    .filter((episode) => {
                      if (!episode.air_date) return false;
                      const airDate = new Date(episode.air_date);
                      return airDate >= today;
                    })
                    .map((episode) => ({
                      id: episode.id,
                      name: episode.name,
                      air_date: episode.air_date,
                      episode_number: episode.episode_number,
                      season_number: episode.season_number,
                      overview: episode.overview || "",
                      still_path: episode.still_path,
                      vote_average: episode.vote_average || 0,
                      vote_count: episode.vote_count || 0,
                      runtime: episode.runtime || null,
                      episode_type: episode.episode_type || "standard",
                    }));

                  upcomingEpisodes.push(...futureEpisodesInSeason);
                }
              } catch (seasonError) {
                console.log(
                  `Error obteniendo temporada ${season} para serie ${series.name} (TMDB ID: ${series.tmdb_id}):`,
                  seasonError.message
                );
                continue;
              }
            }
          }

          // Ordenar episodios por fecha de emisión
          upcomingEpisodes.sort(
            (a, b) =>
              new Date(a.air_date).getTime() - new Date(b.air_date).getTime()
          );

          // Agregar la serie con sus episodios futuros
          seriesWithEpisodes.push({
            series_id: series.id,
            series_name: series.name,
            series_tmdb_id: series.tmdb_id,
            group_id: group.id,
            group_name: group.name,
            poster_path: series.poster_path,
            backdrop_path: series.backdrop_path,
            overview: series.overview,
            first_air_date: series.first_air_date,
            number_of_seasons: series.number_of_seasons,
            number_of_episodes: series.number_of_episodes,
            vote_average: series.vote_average,
            popularity: series.popularity,
            upcoming_episodes: upcomingEpisodes,
            total_upcoming_episodes: upcomingEpisodes.length,
            tmdb_status: "success",
            series_status: seriesDetails.status || "Unknown",
            in_production: seriesDetails.in_production || false,
            last_air_date: seriesDetails.last_air_date || null,
          });
        } catch (seriesError) {
          console.log(
            `Error obteniendo detalles de serie ${series.name} (TMDB ID: ${series.tmdb_id}):`,
            seriesError.message
          );

          // Agregar la serie sin episodios si hay error, pero con información básica
          seriesWithEpisodes.push({
            series_id: series.id,
            series_name: series.name,
            series_tmdb_id: series.tmdb_id,
            group_id: group.id,
            group_name: group.name,
            poster_path: series.poster_path,
            backdrop_path: series.backdrop_path,
            overview: series.overview,
            first_air_date: series.first_air_date,
            number_of_seasons: series.number_of_seasons,
            number_of_episodes: series.number_of_episodes,
            vote_average: series.vote_average,
            popularity: series.popularity,
            upcoming_episodes: [],
            total_upcoming_episodes: 0,
            tmdb_status: "error",
            tmdb_error: seriesError.message,
            series_status: "Unknown",
            in_production: false,
            last_air_date: null,
          });
        }
      }
    }

    // Ordenar series por número de episodios futuros (más primero)
    seriesWithEpisodes.sort(
      (a, b) => b.total_upcoming_episodes - a.total_upcoming_episodes
    );

    return seriesWithEpisodes;
  }
}
