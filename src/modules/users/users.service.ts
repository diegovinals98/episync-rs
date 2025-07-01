import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { SearchUsersDto } from './dto/search-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException(`Usuario con username ${username} no encontrado`);
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
      throw new ConflictException('El nombre de usuario ya está en uso');
    }

    // Verificar si el email ya existe
    const existingEmail = await this.usersRepository.findOne({
      where: { email: userData.email },
    });
    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está en uso');
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

  async updateVerificationStatus(userId: number, verified: boolean): Promise<void> {
    await this.usersRepository.update(userId, {
      email_verified: verified,
      verification_token: null,
    });
  }

  async updateResetPasswordToken(userId: number, token: string, expires: Date): Promise<void> {
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
    const queryBuilder = this.usersRepository.createQueryBuilder('user')
      .where(
        'user.name LIKE :searchTerm OR user.lastname LIKE :searchTerm OR user.username LIKE :searchTerm OR user.email LIKE :searchTerm',
        { searchTerm: `%${q}%` }
      )
      .orderBy('user.name', 'ASC')
      .addOrderBy('user.lastname', 'ASC');

    // Obtener el total de resultados
    const total = await queryBuilder.getCount();

    // Obtener los resultados paginados
    const users = await queryBuilder
      .select([
        'user.id',
        'user.username',
        'user.name',
        'user.lastname',
        'user.email',
        'user.avatar_url',
        'user.created_at',
        'user.updated_at'
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
} 