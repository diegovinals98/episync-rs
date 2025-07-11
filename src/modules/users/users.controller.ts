import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SearchUsersDto } from "./dto/search-users.dto";
import { UserPushToken } from "./entities/user-push-token.entity";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(UserPushToken)
    private readonly pushTokenRepo: Repository<UserPushToken>
  ) {}

  @Get("search")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Buscar usuarios por nombre, apellido, username o email",
  })
  @ApiQuery({ name: "q", description: "Término de búsqueda", example: "maria" })
  @ApiQuery({
    name: "page",
    description: "Número de página",
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: "limit",
    description: "Resultados por página",
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Usuarios encontrados",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Usuarios encontrados" },
        data: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number", example: 2 },
                  username: { type: "string", example: "mariavinals" },
                  name: { type: "string", example: "María" },
                  lastname: { type: "string", example: "Viñals" },
                  email: { type: "string", example: "maria@example.com" },
                  avatar_url: { type: "string", nullable: true, example: null },
                  created_at: {
                    type: "string",
                    format: "date-time",
                    example: "2024-01-15T10:30:00Z",
                  },
                  updated_at: {
                    type: "string",
                    format: "date-time",
                    example: "2024-01-15T10:30:00Z",
                  },
                },
              },
            },
            total: { type: "number", example: 2 },
            page: { type: "number", example: 1 },
            limit: { type: "number", example: 10 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 400, description: "Parámetros de búsqueda inválidos" })
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    const result = await this.usersService.searchUsers(searchDto);

    return {
      success: true,
      message: "Usuarios encontrados",
      data: result,
    };
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener dashboard del usuario autenticado" })
  @ApiResponse({
    status: 200,
    description: "Dashboard del usuario",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            stats: {
              type: "object",
              properties: {
                seriesWatching: { type: "number", example: 5 },
                episodesWatched: { type: "number", example: 123 },
                hoursWatched: { type: "number", example: 56 },
                groupsJoined: { type: "number", example: 3 },
              },
            },
            series: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number", example: 1 },
                  name: { type: "string", example: "Breaking Bad" },
                  poster_url: {
                    type: "string",
                    example: "https://image.tmdb.org/t/p/w300/xyz.jpg",
                  },
                  progress: { type: "number", example: 80 },
                  total_episodes: { type: "number", example: 62 },
                  watched_episodes: { type: "number", example: 50 },
                  last_episode: { type: "string", example: "S05E10" },
                },
              },
            },
          },
        },
      },
    },
  })
  async getDashboard(@Req() req: Request) {
    const userId = req.user["id"];
    const dashboard = await this.usersService.getUserDashboard(userId);
    return {
      success: true,
      data: dashboard,
    };
  }

  @Post("push-token")
  @UseGuards(JwtAuthGuard)
  async savePushToken(
    @Body("expo_push_token") expoPushToken: string,
    @Req() req
  ) {
    const userId = req.user["id"];
    if (!expoPushToken) {
      return { success: false, error: "expo_push_token es requerido" };
    }
    try {
      let token = await this.pushTokenRepo.findOne({
        where: { user_id: userId, expo_push_token: expoPushToken },
      });
      if (token) {
        // Ya existe, no hacer nada
        return {
          success: true,
          data: {
            expo_push_token: token.expo_push_token,
            user_id: String(token.user_id),
            updated_at: token.updated_at.toISOString(),
          },
        };
      }
      // No existe, lo creamos
      token = this.pushTokenRepo.create({
        user_id: userId,
        expo_push_token: expoPushToken,
      });
      token.updated_at = new Date();
      await this.pushTokenRepo.save(token);
      return {
        success: true,
        data: {
          expo_push_token: token.expo_push_token,
          user_id: String(token.user_id),
          updated_at: token.updated_at.toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "No se pudo guardar el token: " + error.message,
      };
    }
  }
}
