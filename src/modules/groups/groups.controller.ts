import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AddSeriesDto } from "./dto/add-series.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { Comment } from "./entities/comment.entity";
import { GroupsService } from "./groups.service";

@ApiTags("Groups")
@Controller("groups")
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>
  ) {}

  @Get("user")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener grupos del usuario autenticado" })
  @ApiResponse({
    status: 200,
    description: "Lista de grupos del usuario",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            groups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number", example: 1 },
                  name: { type: "string", example: "Familia Viñals" },
                  description: {
                    type: "string",
                    example: "Grupo familiar para seguir series juntos",
                  },
                  image_url: {
                    type: "string",
                    nullable: true,
                    example:
                      "https://episyncdv.s3.eu-north-1.amazonaws.com/groups/group-photos/group-123-photo.jpg",
                  },
                  created_at: {
                    type: "string",
                    format: "date-time",
                    example: "2023-07-15T10:30:00Z",
                  },
                  member_count: { type: "number", example: 4 },
                  is_admin: { type: "boolean", example: true },
                  series_count: { type: "number", example: 3 },
                  last_activity: {
                    type: "string",
                    format: "date-time",
                    example: "2023-07-30T18:45:22Z",
                  },
                  members: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number", example: 1 },
                        username: { type: "string", example: "diegovinals" },
                        name: { type: "string", example: "Diego" },
                        lastname: { type: "string", example: "Viñals" },
                        avatar_url: {
                          type: "string",
                          nullable: true,
                          example: null,
                        },
                        role: { type: "string", example: "admin" },
                      },
                    },
                  },
                  recent_activity: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number", example: 101 },
                        type: { type: "string", example: "episode_watched" },
                        user_id: { type: "number", example: 2 },
                        username: { type: "string", example: "mariavinals" },
                        name: { type: "string", example: "María" },
                        series_id: { type: "number", example: 5 },
                        series_name: { type: "string", example: "The Crown" },
                        episode_id: { type: "number", example: 42 },
                        episode_name: { type: "string", example: "S04E02" },
                        created_at: {
                          type: "string",
                          format: "date-time",
                          example: "2023-07-30T18:45:22Z",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  async getUserGroups(@Req() request: Request) {
    const userId = request.user["id"];
    const groups = await this.groupsService.getUserGroups(userId);

    return {
      success: true,
      data: {
        groups,
      },
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear un nuevo grupo" })
  @ApiResponse({
    status: 201,
    description: "Grupo creado exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Grupo creado exitosamente" },
        data: {
          type: "object",
          properties: {
            id: { type: "number", example: 5 },
            name: { type: "string", example: "Familia Viñals" },
            description: {
              type: "string",
              example: "Grupo para compartir series con la familia",
            },
            image_url: {
              type: "string",
              example: "https://example.com/images/group-photo.jpg",
            },
            admin_id: { type: "number", example: 1 },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2024-01-20T15:30:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2024-01-20T15:30:00Z",
            },
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number", example: 1 },
                  username: { type: "string", example: "diegovinals" },
                  name: { type: "string", example: "Diego" },
                  lastname: { type: "string", example: "Viñals" },
                  role: { type: "string", example: "admin" },
                },
              },
            },
            member_count: { type: "number", example: 4 },
            series_count: { type: "number", example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos" })
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @Req() request: Request
  ) {
    const adminId = request.user["id"];
    const group = await this.groupsService.createGroup(adminId, createGroupDto);

    return {
      success: true,
      message: "Grupo creado exitosamente",
      data: group,
    };
  }

  @Get(":groupId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener detalles de un grupo específico" })
  @ApiResponse({
    status: 200,
    description: "Detalles del grupo obtenidos exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Group details retrieved successfully",
        },
        data: {
          type: "object",
          properties: {
            id: { type: "number", example: 1 },
            name: { type: "string", example: "Familia Vinals" },
            description: {
              type: "string",
              example: "Grupo para ver series en familia",
            },
            photo_url: {
              type: "string",
              example: "https://example.com/group-photo.jpg",
            },
            is_admin: { type: "boolean", example: true },
            member_count: { type: "number", example: 5 },
            series_count: { type: "number", example: 3 },
            created_at: {
              type: "string",
              format: "date-time",
              example: "2024-01-15T10:30:00Z",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              example: "2024-01-20T14:45:00Z",
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 404, description: "Grupo no encontrado" })
  async getGroupById(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Req() request: Request
  ) {
    const userId = request.user["id"];
    const group = await this.groupsService.getGroupById(groupId, userId);

    return {
      success: true,
      message: "Group details retrieved successfully",
      data: group,
    };
  }

  @Get(":groupId/series")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener series de un grupo específico" })
  @ApiResponse({
    status: 200,
    description: "Series del grupo obtenidas exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Group series retrieved successfully",
        },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "number",
                example: 1,
                description: "ID interno de la BD",
              },
              tmdb_id: {
                type: "number",
                example: 1396,
                description: "ID de TMDB",
              },
              name: { type: "string", example: "Breaking Bad" },
              poster_url: {
                type: "string",
                example:
                  "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
              },
              episodes_count: { type: "number", example: 62 },
              status: { type: "string", example: "Completed" },
              last_episode: { type: "string", example: "S05E16 - Felina" },
              added_at: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 404, description: "Grupo no encontrado" })
  async getGroupSeries(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Req() request: Request
  ) {
    const userId = request.user["id"];
    const series = await this.groupsService.getGroupSeries(groupId, userId);

    return {
      success: true,
      message: "Group series retrieved successfully",
      data: series,
    };
  }

  @Get(":groupId/members")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener miembros de un grupo específico" })
  @ApiResponse({
    status: 200,
    description: "Miembros del grupo obtenidos exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Group members retrieved successfully",
        },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number", example: 1 },
              name: { type: "string", example: "Diego Vinals" },
              username: { type: "string", example: "diego98v" },
              full_name: { type: "string", example: "Diego Vinals García" },
              avatar_url: {
                type: "string",
                example: "https://example.com/diego-avatar.jpg",
              },
              is_admin: { type: "boolean", example: true },
              series_watching: { type: "number", example: 5 },
              episodes_watched: { type: "number", example: 127 },
              joined_at: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 404, description: "Grupo no encontrado" })
  async getGroupMembers(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Req() request: Request
  ) {
    const userId = request.user["id"];
    const members = await this.groupsService.getGroupMembers(groupId, userId);

    return {
      success: true,
      message: "Group members retrieved successfully",
      data: members,
    };
  }

  @Post(":groupId/series")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Agregar una serie a un grupo" })
  @ApiResponse({
    status: 201,
    description: "Serie agregada al grupo exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Serie añadida al grupo correctamente",
        },
        data: {
          type: "object",
          properties: {
            id: {
              type: "number",
              example: 1,
              description: "ID de la relación group_series",
            },
            series_id: {
              type: "number",
              example: 5,
              description: "ID interno de la serie en BD",
            },
            tmdb_id: {
              type: "number",
              example: 1399,
              description: "ID de TMDB",
            },
            series_name: { type: "string", example: "Game of Thrones" },
            added_at: {
              type: "string",
              format: "date-time",
              example: "2024-01-15T10:30:00Z",
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 404, description: "Grupo no encontrado" })
  @ApiResponse({ status: 409, description: "La serie ya está en el grupo" })
  async addSeriesToGroup(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Body() addSeriesDto: AddSeriesDto,
    @Req() request: Request
  ) {
    const userId = request.user["id"];
    const result = await this.groupsService.addSeriesToGroup(
      groupId,
      userId,
      addSeriesDto
    );

    return {
      success: true,
      message: "Serie añadida al grupo correctamente",
      data: result,
    };
  }

  @Get(":groupId/series/:seriesId/progress")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener progreso de los miembros en una serie" })
  @ApiResponse({
    status: 200,
    description: "Progreso de los miembros obtenido exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            series_id: { type: "number", example: 1 },
            tmdb_id: { type: "number", example: 4607 },
            members_progress: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user_id: { type: "number", example: 14 },
                  username: { type: "string", example: "usuario1" },
                  full_name: { type: "string", example: "Usuario Uno" },
                  highest_season: { type: "number", example: 3 },
                  highest_episode: { type: "number", example: 8 },
                  total_episodes_watched: { type: "number", example: 25 },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 404, description: "Grupo o serie no encontrado" })
  async getSeriesProgress(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Param("seriesId", ParseIntPipe) seriesId: number,
    @Req() request: Request
  ) {
    const userId = request.user["id"];
    const progress = await this.groupsService.getSeriesProgress(
      groupId,
      seriesId,
      userId
    );

    return {
      success: true,
      data: progress,
    };
  }

  @Get(":groupId/series/:seriesId/season/:seasonNumber/episodes-watched")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Obtener episodios vistos de una temporada por el usuario",
  })
  @ApiResponse({
    status: 200,
    description: "Episodios vistos obtenidos exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            series_id: { type: "number", example: 1 },
            season_number: { type: "number", example: 1 },
            episodes_watched: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  episode_id: { type: "number", example: 333924 },
                  episode_number: { type: "number", example: 1 },
                  season_number: { type: "number", example: 1 },
                  watched_at: {
                    type: "string",
                    format: "date-time",
                    example: "2025-01-02T11:38:52.712Z",
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  @ApiResponse({ status: 404, description: "Grupo o serie no encontrado" })
  async getSeasonEpisodesWatched(
    @Param("groupId", ParseIntPipe) groupId: number,
    @Param("seriesId", ParseIntPipe) seriesId: number,
    @Param("seasonNumber", ParseIntPipe) seasonNumber: number,
    @Req() request: Request
  ) {
    const userId = request.user["id"];
    const episodesWatched = await this.groupsService.getSeasonEpisodesWatched(
      groupId,
      seriesId,
      seasonNumber,
      userId
    );

    return {
      success: true,
      data: episodesWatched,
    };
  }

  @Get(":groupId/series/:seriesId/comments")
  async getCommentsForGroupSeries(
    @Param("groupId") groupId: number,
    @Param("seriesId") seriesId: number
  ) {
    const comments = await this.commentRepository.find({
      where: { group_id: groupId, series_id: seriesId },
      order: { created_at: "ASC" },
      relations: ["user"],
    });
    return {
      success: true,
      data: comments.map((c) => ({
        id: c.id,
        groupId: c.group_id,
        seriesId: c.series_id,
        message: c.message,
        replyTo: c.reply_to,
        userId: c.user_id,
        username: c.user?.username || null,
        name: c.user?.name || null,
        lastname: c.user?.lastname || null,
        timestamp: c.created_at,
      })),
    };
  }

  @Get("user/upcoming-episodes")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Obtener todas las series de los grupos del usuario con sus episodios futuros",
  })
  @ApiResponse({
    status: 200,
    description: "Series con episodios futuros obtenidas correctamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        status: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Series con episodios futuros obtenidas correctamente",
        },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              series_id: { type: "number", example: 1 },
              series_name: { type: "string", example: "Breaking Bad" },
              series_tmdb_id: { type: "number", example: 1396 },
              group_id: { type: "number", example: 1 },
              group_name: { type: "string", example: "Familia Viñals" },
              poster_path: { type: "string", example: "/path/to/poster.jpg" },
              backdrop_path: {
                type: "string",
                example: "/path/to/backdrop.jpg",
              },
              overview: { type: "string", example: "Descripción de la serie" },
              first_air_date: { type: "string", example: "2008-01-20" },
              number_of_seasons: { type: "number", example: 5 },
              number_of_episodes: { type: "number", example: 62 },
              vote_average: { type: "number", example: 9.5 },
              popularity: { type: "number", example: 100.0 },
              total_upcoming_episodes: { type: "number", example: 3 },
              upcoming_episodes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number", example: 123456 },
                    name: { type: "string", example: "Nombre del Episodio" },
                    air_date: { type: "string", example: "2025-01-15" },
                    episode_number: { type: "number", example: 1 },
                    season_number: { type: "number", example: 2 },
                    overview: {
                      type: "string",
                      example: "Descripción del episodio",
                    },
                    still_path: {
                      type: "string",
                      example: "/path/to/still.jpg",
                    },
                    vote_average: { type: "number", example: 8.5 },
                    vote_count: { type: "number", example: 150 },
                    runtime: { type: "number", example: 45 },
                    episode_type: {
                      type: "string",
                      example: "standard",
                      description:
                        "Tipo de episodio: 'standard', 'finale', 'pilot', etc.",
                    },
                  },
                },
              },
              tmdb_status: {
                type: "string",
                example: "success",
                description:
                  "Estado de la consulta a TMDB: 'success' o 'error'",
              },
              tmdb_error: {
                type: "string",
                example: "Error al obtener detalles de la serie en TMDB",
                description: "Mensaje de error si tmdb_status es 'error'",
              },
              series_status: {
                type: "string",
                example: "Returning Series",
                description: "Estado de la serie según TMDB",
              },
              in_production: {
                type: "boolean",
                example: true,
                description: "Indica si la serie está en producción",
              },
              last_air_date: {
                type: "string",
                example: "2024-10-09",
                description: "Fecha del último episodio emitido",
              },
            },
          },
        },
        error: { type: "null", example: null },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  async getUserUpcomingEpisodes(@Req() request: Request) {
    const userId = request.user["id"];
    const seriesWithEpisodes =
      await this.groupsService.getUserUpcomingEpisodes(userId);

    return {
      success: true,
      status: 200,
      message: "Series con episodios futuros obtenidas correctamente",
      data: seriesWithEpisodes,
      error: null,
    };
  }
}
