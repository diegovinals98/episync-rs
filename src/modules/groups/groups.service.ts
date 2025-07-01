import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Series } from "../series/entities/series.entity";
import { UsersService } from "../users/users.service";
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
    private usersService: UsersService
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
        .map((activity) => ({
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
        }));

      // Obtener la última actividad para determinar last_activity
      const lastActivity =
        recentActivity.length > 0
          ? recentActivity[0].created_at
          : group.created_at;

      // Añadir el grupo formateado al resultado
      groups.push({
        id: group.id,
        name: group.name,
        description: group.description,
        created_at: group.created_at,
        member_count: memberCount,
        is_admin: isAdmin,
        series_count: seriesCount,
        last_activity: lastActivity,
        members: formattedMembers,
        recent_activity: formattedActivity,
      });
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
        id: series.id,
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
    const { seriesId, addedByUserId } = addSeriesDto;

    // Verificar que el usuario es miembro del grupo
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, is_active: true },
    });

    if (!membership) {
      throw new NotFoundException("Grupo no encontrado o no tienes acceso");
    }

    // Verificar que la serie no esté ya en el grupo
    const existingSeries = await this.groupSeriesRepository.findOne({
      where: { group_id: groupId, series_id: seriesId, is_active: true },
    });

    if (existingSeries) {
      throw new NotFoundException("La serie ya está en el grupo");
    }

    // Obtener información de la serie desde TMDB (aquí deberías implementar la lógica)
    // Por ahora, crearemos una serie básica
    const series = await this.seriesRepository.findOne({
      where: { tmdb_id: seriesId },
    });

    let seriesToAdd;
    if (!series) {
      // Si la serie no existe en la base de datos, la creamos
      seriesToAdd = this.seriesRepository.create({
        tmdb_id: seriesId,
        name: `Series ${seriesId}`, // Nombre temporal
        overview: "Descripción temporal",
        vote_average: 0,
        vote_count: 0,
        is_popular: false,
      });
      await this.seriesRepository.save(seriesToAdd);
    } else {
      seriesToAdd = series;
    }

    // Agregar la serie al grupo
    const groupSeries = this.groupSeriesRepository.create({
      group_id: groupId,
      series_id: seriesToAdd.id,
      added_by_user_id: addedByUserId || userId,
      is_active: true,
    });

    await this.groupSeriesRepository.save(groupSeries);

    // Registrar actividad
    await this.groupActivityRepository.save({
      group_id: groupId,
      user_id: userId,
      type: "series_added",
      series_id: seriesToAdd.id,
      series_name: seriesToAdd.name,
    });

    return {
      id: groupSeries.id,
      series_id: seriesToAdd.id,
      series_name: seriesToAdd.name,
      added_at: groupSeries.added_at,
    };
  }
}
