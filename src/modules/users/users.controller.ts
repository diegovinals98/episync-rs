import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
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
import { S3UploadService } from "./s3-upload.service";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(UserPushToken)
    private readonly pushTokenRepo: Repository<UserPushToken>,
    private readonly s3UploadService: S3UploadService
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

  @Post("profile/image")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Subir foto de perfil del usuario" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({
    status: 200,
    description: "Foto de perfil actualizada correctamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        status: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Foto de perfil actualizada correctamente",
        },
        data: {
          type: "object",
          properties: {
            image_url: {
              type: "string",
              example:
                "https://tu-bucket-s3.s3.amazonaws.com/users/profile-photos/user-123-profile-photo.jpg",
            },
            filename: { type: "string", example: "user-123-profile-photo.jpg" },
            size: { type: "number", example: 245760 },
            mime_type: { type: "string", example: "image/jpeg" },
            uploaded_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-21T10:30:45.123Z",
            },
          },
        },
        error: { type: "null", example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Error al subir la imagen",
    schema: {
      properties: {
        success: { type: "boolean", example: false },
        status: { type: "number", example: 400 },
        message: { type: "string", example: "Error al subir la imagen" },
        data: { type: "null", example: null },
        error: {
          type: "object",
          properties: {
            code: { type: "string", example: "INVALID_FILE_TYPE" },
            details: {
              type: "string",
              example: "Solo se permiten imágenes JPEG, PNG o GIF",
            },
          },
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("profileImage"))
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
    try {
      const userId = req.user["id"];

      if (!file) {
        throw new BadRequestException("No se proporcionó ningún archivo");
      }

      // Subir imagen a S3
      const uploadResult = await this.s3UploadService.uploadProfileImage(
        file,
        userId
      );

      // Actualizar la URL en la base de datos
      await this.usersService.updateProfileImage(
        userId,
        uploadResult.image_url
      );

      return {
        success: true,
        status: 200,
        message: "Foto de perfil actualizada correctamente",
        data: uploadResult,
        error: null,
      };
    } catch (error) {
      let errorCode = "UPLOAD_ERROR";
      let errorDetails = "Error al subir la imagen";

      if (error.message === "INVALID_FILE_TYPE") {
        errorCode = "INVALID_FILE_TYPE";
        errorDetails = "Solo se permiten imágenes JPEG, PNG o GIF";
      } else if (error.message === "FILE_TOO_LARGE") {
        errorCode = "FILE_TOO_LARGE";
        errorDetails = "El archivo es demasiado grande. Máximo 5MB";
      }

      return {
        success: false,
        status: 400,
        message: "Error al subir la imagen",
        data: null,
        error: {
          code: errorCode,
          details: errorDetails,
        },
      };
    }
  }
}
