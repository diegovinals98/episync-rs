import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { GroupMember } from "../groups/entities/group-member.entity";
import { UserPushToken } from "../users/entities/user-push-token.entity";

@Injectable()
export class NotificationHelperService {
  constructor(
    @InjectRepository(UserPushToken)
    private readonly pushTokenRepo: Repository<UserPushToken>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>
  ) {}

  // Obtener tokens de todos los miembros de un grupo
  async getGroupMemberTokens(
    groupId: number,
    excludeUserId?: number
  ): Promise<string[]> {
    try {
      // Obtener todos los miembros activos del grupo
      const members = await this.groupMemberRepo.find({
        where: { group_id: groupId, is_active: true },
        select: ["user_id"],
      });

      console.log(
        `🔍 Encontrados ${members.length} miembros activos en grupo ${groupId}`
      );

      if (members.length === 0) {
        console.log(
          `⚠️ No se encontraron miembros activos en grupo ${groupId}`
        );
        return [];
      }

      // Extraer los IDs de usuario
      const userIds = members.map((member) => member.user_id);
      console.log(`👥 IDs de usuarios en grupo:`, userIds);

      // Si hay un usuario a excluir, filtrarlo
      const filteredUserIds = excludeUserId
        ? userIds.filter((id) => id !== excludeUserId)
        : userIds;

      console.log(`🚫 Usuario excluido: ${excludeUserId}`);
      console.log(`📱 IDs de usuarios para notificar:`, filteredUserIds);

      if (filteredUserIds.length === 0) {
        console.log(
          `⚠️ No hay usuarios para notificar después de excluir al usuario ${excludeUserId}`
        );
        return [];
      }

      // Obtener los tokens de push de estos usuarios usando In() de TypeORM
      const tokens = await this.pushTokenRepo.find({
        where: { user_id: In(filteredUserIds) },
        select: ["expo_push_token"],
      });

      console.log(
        `📱 Encontrados ${tokens.length} tokens de push para ${filteredUserIds.length} usuarios`
      );

      return tokens.map((token) => token.expo_push_token);
    } catch (error) {
      console.error("Error obteniendo tokens del grupo:", error);
      return [];
    }
  }

  // Obtener tokens de un usuario específico
  async getUserTokens(userId: number): Promise<string[]> {
    try {
      const tokens = await this.pushTokenRepo.find({
        where: { user_id: userId },
        select: ["expo_push_token"],
      });

      return tokens.map((token) => token.expo_push_token);
    } catch (error) {
      console.error("Error obteniendo tokens del usuario:", error);
      return [];
    }
  }

  // Obtener tokens de múltiples usuarios
  async getMultipleUserTokens(userIds: number[]): Promise<string[]> {
    try {
      if (userIds.length === 0) {
        return [];
      }

      const tokens = await this.pushTokenRepo.find({
        where: { user_id: In(userIds) },
        select: ["expo_push_token"],
      });

      return tokens.map((token) => token.expo_push_token);
    } catch (error) {
      console.error("Error obteniendo tokens de múltiples usuarios:", error);
      return [];
    }
  }
}
