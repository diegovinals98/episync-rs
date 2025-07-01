import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { User, UserRole } from "../users/entities/user.entity";

@Injectable()
export class DevelopmentService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async seedUsers() {
    const users = [
      {
        username: "diegovinals",
        name: "Diego",
        lastname: "Viñals",
        email: "diego@example.com",
        password: "password123",
        role: UserRole.ADMIN,
        email_verified: true,
      },
      {
        username: "mariavinals",
        name: "María",
        lastname: "Viñals",
        email: "maria@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
      },
      {
        username: "carlosgarcia",
        name: "Carlos",
        lastname: "García",
        email: "carlos.garcia@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
        avatar_url: "https://example.com/avatars/carlos.jpg",
      },
      {
        username: "anaperez",
        name: "Ana",
        lastname: "Pérez",
        email: "ana.perez@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
      },
      {
        username: "luisrodriguez",
        name: "Luis",
        lastname: "Rodríguez",
        email: "luis.rodriguez@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
        avatar_url: "https://example.com/avatars/luis.jpg",
      },
      {
        username: "carmenlopez",
        name: "Carmen",
        lastname: "López",
        email: "carmen.lopez@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
      },
      {
        username: "javiergonzalez",
        name: "Javier",
        lastname: "González",
        email: "javier.gonzalez@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
        avatar_url: "https://example.com/avatars/javier.jpg",
      },
      {
        username: "isabelmartinez",
        name: "Isabel",
        lastname: "Martínez",
        email: "isabel.martinez@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
      },
      {
        username: "miguelhernandez",
        name: "Miguel",
        lastname: "Hernández",
        email: "miguel.hernandez@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
        avatar_url: "https://example.com/avatars/miguel.jpg",
      },
      {
        username: "elenasanchez",
        name: "Elena",
        lastname: "Sánchez",
        email: "elena.sanchez@example.com",
        password: "password123",
        role: UserRole.USER,
        email_verified: true,
      },
    ];

    const createdUsers = [];
    const existingUsers = [];

    for (const userData of users) {
      const existingUser = await this.usersRepository.findOne({
        where: { username: userData.username },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = this.usersRepository.create({
          ...userData,
          password: hashedPassword,
        });
        const savedUser = await this.usersRepository.save(user);
        createdUsers.push(savedUser.username);
        console.log(`Usuario creado: ${userData.username}`);
      } else {
        existingUsers.push(userData.username);
        console.log(`Usuario ya existe: ${userData.username}`);
      }
    }

    return {
      message: "Datos de prueba procesados",
      created: createdUsers,
      existing: existingUsers,
      totalCreated: createdUsers.length,
      totalExisting: existingUsers.length,
    };
  }
}
