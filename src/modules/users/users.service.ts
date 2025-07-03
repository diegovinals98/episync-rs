import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { SearchUsersDto } from "./dto/search-users.dto";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException(
        `Usuario con username ${username} no encontrado`
      );
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }
    return user;
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    // Verificar si el username ya existe
    const existingUsername = await this.usersRepository.findOne({
      where: { username: userData.username },
    });
    if (existingUsername) {
      throw new ConflictException("El nombre de usuario ya está en uso");
    }

    // Verificar si el email ya existe
    const existingEmail = await this.usersRepository.findOne({
      where: { email: userData.email },
    });
    if (existingEmail) {
      throw new ConflictException("El correo electrónico ya está en uso");
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Crear el usuario
    const newUser = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });

    return this.usersRepository.save(newUser);
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      last_login: new Date(),
    });
  }

  async updateVerificationStatus(
    userId: number,
    verified: boolean
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      email_verified: verified,
      verification_token: null,
    });
  }

  async updateResetPasswordToken(
    userId: number,
    token: string,
    expires: Date
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      reset_password_token: token,
      reset_password_expires: expires,
    });
  }

  async resetPassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, {
      password: hashedPassword,
      reset_password_token: null,
      reset_password_expires: null,
    });
  }

  async searchUsers(searchDto: SearchUsersDto) {
    const { q, page = 1, limit = 10 } = searchDto;
    const offset = (page - 1) * limit;

    // Crear la consulta base con LIKE para búsqueda en múltiples campos
    const queryBuilder = this.usersRepository
      .createQueryBuilder("user")
      .where(
        "user.name LIKE :searchTerm OR user.lastname LIKE :searchTerm OR user.username LIKE :searchTerm OR user.email LIKE :searchTerm",
        { searchTerm: `%${q}%` }
      )
      .orderBy("user.name", "ASC")
      .addOrderBy("user.lastname", "ASC");

    // Obtener el total de resultados
    const total = await queryBuilder.getCount();

    // Obtener los resultados paginados
    const users = await queryBuilder
      .select([
        "user.id",
        "user.username",
        "user.name",
        "user.lastname",
        "user.email",
        "user.avatar_url",
        "user.created_at",
        "user.updated_at",
      ])
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      data: users,
      total,
      page,
      limit,
    };
  }

  async getUserDashboard(userId: number) {
    // Obtener número de grupos a los que pertenece
    const groupsJoined = await this.usersRepository.manager.query(
      `SELECT COUNT(*) as count FROM group_members WHERE user_id = ? AND is_active = 1`,
      [userId]
    );
    // Obtener series que está viendo (seriesWatching) y episodios vistos
    const seriesWatching = await this.usersRepository.manager.query(
      `SELECT DISTINCT ue.series_id FROM user_episodes ue WHERE ue.user_id = ? AND ue.watched = 1`,
      [userId]
    );
    const episodesWatched = await this.usersRepository.manager.query(
      `SELECT COUNT(*) as count FROM user_episodes WHERE user_id = ? AND watched = 1`,
      [userId]
    );
    // Calcular horas vistas (asumiendo 45min por episodio)
    const hoursWatched = Math.round((episodesWatched[0]?.count || 0) * 0.75);
    // Obtener info de series y progreso
    const series = await this.usersRepository.manager.query(
      `SELECT s.id, s.name, s.poster_path, COUNT(ue.id) as watched_episodes
       FROM series s
       JOIN user_episodes ue ON ue.series_id = s.id AND ue.user_id = ? AND ue.watched = 1
       GROUP BY s.id, s.name, s.poster_path`,
      [userId]
    );
    // Obtener total de episodios por serie y último episodio visto
    for (const s of series) {
      const totalEpisodes = await this.usersRepository.manager.query(
        `SELECT COUNT(*) as count FROM episodes WHERE series_id = ?`,
        [s.id]
      );
      s.total_episodes = totalEpisodes[0]?.count || 0;
      s.progress = s.total_episodes
        ? Math.round((s.watched_episodes / s.total_episodes) * 100)
        : 0;
      // Último episodio visto
      const lastEp = await this.usersRepository.manager.query(
        `SELECT season_number, episode_number FROM user_episodes ue JOIN episodes e ON ue.episode_id = e.id WHERE ue.user_id = ? AND ue.series_id = ? AND ue.watched = 1 ORDER BY ue.watched_at DESC LIMIT 1`,
        [userId, s.id]
      );
      s.last_episode = lastEp[0]
        ? `S${lastEp[0].season_number.toString().padStart(2, "0")}E${lastEp[0].episode_number.toString().padStart(2, "0")}`
        : null;
      s.poster_url = s.poster_path
        ? `https://image.tmdb.org/t/p/w300${s.poster_path}`
        : null;
      delete s.poster_path;
    }
    return {
      stats: {
        seriesWatching: seriesWatching.length,
        episodesWatched: episodesWatched[0]?.count || 0,
        hoursWatched,
        groupsJoined: groupsJoined[0]?.count || 0,
      },
      series,
    };
  }
}
