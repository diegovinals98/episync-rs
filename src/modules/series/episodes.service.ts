import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GroupActivity } from "../groups/entities/group-activity.entity";
import { GroupMember } from "../groups/entities/group-member.entity";
import { WebSocketsGateway } from "../websockets/websockets.gateway";
import { Episode } from "./entities/episode.entity";
import { Series } from "./entities/series.entity";
import { UserEpisode } from "./entities/user-episode.entity";
import { TmdbService } from "./tmdb.service";

@Injectable()
export class EpisodesService {
  constructor(
    @InjectRepository(Episode)
    public episodeRepository: Repository<Episode>,
    @InjectRepository(UserEpisode)
    public userEpisodeRepository: Repository<UserEpisode>,
    @InjectRepository(GroupActivity)
    public groupActivityRepository: Repository<GroupActivity>,
    @InjectRepository(Series)
    public seriesRepository: Repository<Series>,
    @InjectRepository(GroupMember)
    public groupMemberRepository: Repository<GroupMember>,
    private tmdbService: TmdbService,
    @Inject(forwardRef(() => WebSocketsGateway))
    private websocketsGateway: WebSocketsGateway
  ) {}

  /**
   * Obtener datos de un episodio desde TMDB
   */
  private async getEpisodeDataFromTMDB(episodeId: number, seriesId: number) {
    try {
      // Intentar obtener información de la serie para saber cuántas temporadas tiene
      const seriesDetails = await this.tmdbService.getSeriesDetails(seriesId);
      const numberOfSeasons = seriesDetails.number_of_seasons || 10;

      // Buscar en las temporadas disponibles para encontrar el episodio
      for (let season = 1; season <= Math.min(numberOfSeasons, 20); season++) {
        try {
          const seasonData = await this.tmdbService.getSeriesSeasons(
            seriesId,
            season
          );

          if (seasonData.episodes && seasonData.episodes.length > 0) {
            const episode = seasonData.episodes.find(
              (ep) => ep.id === episodeId
            );
            if (episode) {
              return {
                tmdb_id: episode.id,
                series_id: seriesId,
                season_number: season,
                episode_number: episode.episode_number,
                name: episode.name,
                overview: episode.overview || "",
                air_date: episode.air_date,
                still_path: episode.still_path,
                vote_average: episode.vote_average || 0,
                vote_count: episode.vote_count || 0,
                runtime: episode.runtime || null,
              };
            }
          }
        } catch (error) {
          // Si no encuentra la temporada, continuar con la siguiente
          console.log(`Season ${season} not found for series ${seriesId}`);
          continue;
        }
      }

      // Si no se encuentra, devolver datos básicos
      console.log(`Episode ${episodeId} not found in series ${seriesId}`);
      return {
        tmdb_id: episodeId,
        series_id: seriesId,
        season_number: 1,
        episode_number: 1,
        name: `Episode ${episodeId}`,
        overview: "",
        air_date: null,
        still_path: null,
        vote_average: 0,
        vote_count: 0,
        runtime: null,
      };
    } catch (error) {
      console.error("Error fetching episode data from TMDB:", error);
      // Devolver datos básicos en caso de error
      return {
        tmdb_id: episodeId,
        series_id: seriesId,
        season_number: 1,
        episode_number: 1,
        name: `Episode ${episodeId}`,
        overview: "",
        air_date: null,
        still_path: null,
        vote_average: 0,
        vote_count: 0,
        runtime: null,
      };
    }
  }

  /**
   * Marcar un episodio como visto por un usuario
   */
  async markEpisodeWatched(
    userId: number,
    episodeId: number,
    seriesId: number,
    groupId?: number
  ) {
    try {
      // Verificar si el episodio existe
      let episode = await this.episodeRepository.findOne({
        where: { tmdb_id: episodeId },
      });

      if (!episode) {
        // Si el episodio no existe, obtener datos reales desde TMDB
        const episodeData = await this.getEpisodeDataFromTMDB(
          episodeId,
          seriesId
        );

        const newEpisode = this.episodeRepository.create({
          tmdb_id: episodeData.tmdb_id,
          series_id: episodeData.series_id,
          season_number: episodeData.season_number,
          episode_number: episodeData.episode_number,
          name: episodeData.name,
          overview: episodeData.overview,
          air_date: episodeData.air_date
            ? new Date(episodeData.air_date)
            : null,
          still_path: episodeData.still_path,
          vote_average: episodeData.vote_average,
          vote_count: episodeData.vote_count,
          runtime: episodeData.runtime,
        });
        episode = await this.episodeRepository.save(newEpisode);
      }

      // Verificar si ya está marcado como visto
      const existingUserEpisode = await this.userEpisodeRepository.findOne({
        where: {
          user_id: userId,
          episode_id: episode.id, // Usar el ID del episodio (no el tmdb_id)
        },
      });

      if (existingUserEpisode) {
        // Actualizar timestamp
        existingUserEpisode.watched_at = new Date();
        await this.userEpisodeRepository.save(existingUserEpisode);
        return existingUserEpisode;
      }

      // Crear nuevo registro
      const userEpisode = this.userEpisodeRepository.create({
        user_id: userId,
        episode_id: episode.id, // Usar el ID del episodio (no el tmdb_id)
        series_id: seriesId,
        watched: true,
        watched_at: new Date(),
      });

      await this.userEpisodeRepository.save(userEpisode);

      // Guardar actividad en el grupo si se proporciona groupId
      if (groupId) {
        console.log(
          `Guardando actividad para grupo ${groupId}, usuario ${userId}, episodio ${episode.id}`
        );
        try {
          // Obtener el nombre de la serie
          const series = await this.seriesRepository.findOne({
            where: { id: seriesId },
          });

          const seriesName = series ? series.name : `Serie ${seriesId}`;

          await this.groupActivityRepository.save({
            group_id: groupId,
            user_id: userId,
            type: "episode_watched",
            series_id: seriesId,
            series_name: seriesName,
            episode_id: episode.id,
            episode_name: `S${episode.season_number}E${episode.episode_number}`,
            created_at: new Date(),
          });
          console.log(
            `✅ Actividad guardada exitosamente con serie: ${seriesName}`
          );
        } catch (error) {
          console.error(`❌ Error guardando actividad:`, error);
        }
      } else {
        console.log(`⚠️ No se proporcionó groupId, no se guarda actividad`);
      }

      return userEpisode;
    } catch (error) {
      throw new Error(`Error al marcar episodio como visto: ${error.message}`);
    }
  }

  /**
   * Marcar un episodio como visto por un usuario usando datos proporcionados (toggle)
   */
  async markEpisodeWatchedWithData(
    userId: number,
    episodeId: number, // TMDB episode ID
    seriesId: number, // Internal series ID
    episodeNumber: number,
    seasonNumber: number,
    groupId?: number
  ) {
    try {
      // Verificar si el episodio existe
      let episode = await this.episodeRepository.findOne({
        where: { tmdb_id: episodeId },
      });

      if (!episode) {
        // Si el episodio no existe, lo creamos con los datos proporcionados
        const newEpisode = this.episodeRepository.create({
          tmdb_id: episodeId,
          series_id: seriesId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          name: `S${seasonNumber}E${episodeNumber}`,
          overview: "",
          air_date: null,
          still_path: null,
          vote_average: 0,
          vote_count: 0,
          runtime: null,
        });
        episode = await this.episodeRepository.save(newEpisode);
      }

      // Verificar si ya está marcado como visto
      const existingUserEpisode = await this.userEpisodeRepository.findOne({
        where: {
          user_id: userId,
          episode_id: episode.id, // Usar el ID del episodio (no el tmdb_id)
        },
      });

      if (existingUserEpisode) {
        // Si ya está visto, lo marcamos como no visto (toggle)
        await this.userEpisodeRepository.remove(existingUserEpisode);

        // No registramos actividad cuando se marca como no visto
        // (la tabla group_activity no tiene 'episode_unwatched' en el ENUM)

        // Ya no emitimos desde aquí, lo hacemos desde el gateway
        return { action: "unwatched", episode: existingUserEpisode };
      }

      // Si no está visto, lo marcamos como visto
      const userEpisode = this.userEpisodeRepository.create({
        user_id: userId,
        episode_id: episode.id, // Usar el ID del episodio (no el tmdb_id)
        series_id: seriesId,
        watched: true,
        watched_at: new Date(),
      });

      await this.userEpisodeRepository.save(userEpisode);

      // Guardar actividad en el grupo si se proporciona groupId
      if (groupId) {
        console.log(
          `Guardando actividad para grupo ${groupId}, usuario ${userId}, episodio ${episode.id}`
        );
        try {
          // Obtener el nombre de la serie
          const series = await this.seriesRepository.findOne({
            where: { id: seriesId },
          });

          const seriesName = series ? series.name : `Serie ${seriesId}`;

          await this.groupActivityRepository.save({
            group_id: groupId,
            user_id: userId,
            type: "episode_watched",
            series_id: seriesId,
            series_name: seriesName,
            episode_id: episode.id,
            episode_name: `S${seasonNumber}E${episodeNumber}`,
            created_at: new Date(),
          });
          console.log(
            `✅ Actividad guardada exitosamente con serie: ${seriesName}`
          );

          // Ya no emitimos desde aquí, lo hacemos desde el gateway
        } catch (error) {
          console.error(`❌ Error guardando actividad:`, error);
        }
      } else {
        console.log(`⚠️ No se proporcionó groupId, no se guarda actividad`);
      }

      return { action: "watched", episode: userEpisode };
    } catch (error) {
      throw new Error(`Error al marcar episodio como visto: ${error.message}`);
    }
  }

  /**
   * Obtener episodios vistos por un usuario
   */
  async getWatchedEpisodes(userId: number, seriesId?: number) {
    const whereCondition: any = { user_id: userId, watched: true };

    if (seriesId) {
      whereCondition.series_id = seriesId;
    }

    return await this.userEpisodeRepository.find({
      where: whereCondition,
      relations: ["episode"],
      order: { watched_at: "DESC" },
    });
  }

  /**
   * Obtener estadísticas de episodios vistos
   */
  async getWatchedStats(userId: number) {
    const totalWatched = await this.userEpisodeRepository.count({
      where: { user_id: userId, watched: true },
    });

    const seriesWatched = await this.userEpisodeRepository
      .createQueryBuilder("ue")
      .select("ue.series_id")
      .where("ue.user_id = :userId", { userId })
      .andWhere("ue.watched = :watched", { watched: true })
      .distinct()
      .getCount();

    return {
      totalEpisodes: totalWatched,
      seriesCount: seriesWatched,
    };
  }
}
