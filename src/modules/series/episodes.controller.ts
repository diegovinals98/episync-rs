import {
  Controller,
  Get,
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
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { EpisodesService } from "./episodes.service";

@ApiTags("Episodes")
@Controller("episodes")
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Get("upcoming")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener próximos episodios de las series que el usuario está viendo" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Número máximo de episodios a devolver",
    example: 10,
  })
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
    description: "Número de episodios a saltar",
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: "Próximos episodios obtenidos exitosamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Próximos episodios obtenidos correctamente" },
        data: {
          type: "object",
          properties: {
            episodes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number", example: 5477828 },
                  name: { type: "string", example: "Chapter One: The Crawl" },
                  overview: { type: "string", example: "" },
                  vote_average: { type: "number", example: 0 },
                  vote_count: { type: "number", example: 0 },
                  air_date: { type: "string", example: "2025-11-26" },
                  episode_number: { type: "number", example: 1 },
                  episode_type: { type: "string", example: "standard" },
                  production_code: { type: "string", example: "" },
                  runtime: { type: "number", example: 96 },
                  season_number: { type: "number", example: 5 },
                  show_id: { type: "number", example: 66732 },
                  still_path: { type: "string", example: "/jnpSxSMdFAj4dtF59agzgmKM9fg.jpg" },
                  series: {
                    type: "object",
                    properties: {
                      id: { type: "number", example: 66732 },
                      name: { type: "string", example: "Stranger Things" },
                      poster_path: { type: "string", example: "/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg" },
                    },
                  },
                },
              },
            },
            total: { type: "number", example: 5 },
            limit: { type: "number", example: 10 },
            offset: { type: "number", example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "No hay próximos episodios",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "No hay próximos episodios" },
        data: {
          type: "object",
          properties: {
            episodes: { type: "array", items: {}, example: [] },
            total: { type: "number", example: 0 },
            limit: { type: "number", example: 10 },
            offset: { type: "number", example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "No autorizado" })
  async getUpcomingEpisodes(
    @Req() request: Request,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const userId = request.user["id"];
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const result = await this.episodesService.getUpcomingEpisodes(
      userId,
      limitNum,
      offsetNum
    );

    if (result.episodes.length === 0) {
      return {
        success: true,
        message: "No hay próximos episodios",
        data: {
          episodes: [],
          total: 0,
          limit: limitNum,
          offset: offsetNum,
        },
      };
    }

    return {
      success: true,
      message: "Próximos episodios obtenidos correctamente",
      data: result,
    };
  }
}

