import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class TmdbService {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly imageBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get<string>("tmdb.apiKey");
    this.baseUrl = "https://api.themoviedb.org/3";
    this.imageBaseUrl = "https://image.tmdb.org/t/p";

    // Debug: Verificar que la API key se está cargando correctamente
    console.log("TMDB API Key loaded:", this.accessToken ? "YES" : "NO");
    console.log(this.accessToken);
    if (this.accessToken) {
      console.log("TMDB API Key length:", this.accessToken.length);
      console.log(
        "TMDB API Key starts with:",
        this.accessToken.substring(0, 10) + "..."
      );
    }
  }

  async searchSeries(query: string, page = 1, language = "en-US") {
    try {
      const response = await axios.get(`${this.baseUrl}/search/tv`, {
        params: {
          api_key: this.accessToken,
          query,
          page,
          language,
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "TMDB Search Error:",
        error.response?.data || error.message
      );
      throw new HttpException(
        "Error al buscar series en TMDB",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getSeriesDetails(seriesId: number, language = "en-US") {
    try {
      console.log("Bearer " + this.accessToken);
      const response = await axios.get(`${this.baseUrl}/tv/${seriesId}`, {
        headers: {
          Authorization: "Bearer " + this.accessToken,
        },
        params: {
          language,
          append_to_response: "credits,videos,images,external_ids",
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "TMDB Series Details Error:",
        error.response?.data || error.message
      );
      throw new HttpException(
        "Error al obtener detalles de la serie en TMDB",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getSeriesSeasons(
    seriesId: number,
    seasonNumber: number,
    language = "en-US"
  ) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/tv/${seriesId}/season/${seasonNumber}`,
        {
          params: {
            api_key: this.accessToken,
            language,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "TMDB Season Error:",
        error.response?.data || error.message
      );
      throw new HttpException(
        "Error al obtener temporada de la serie en TMDB",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getSeriesEpisode(
    seriesId: number,
    seasonNumber: number,
    episodeNumber: number,
    language = "en-US"
  ) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`,
        {
          params: {
            api_key: this.accessToken,
            language,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "TMDB Episode Error:",
        error.response?.data || error.message
      );
      throw new HttpException(
        "Error al obtener episodio de la serie en TMDB",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getPopularSeries(page = 1, language = "en-US") {
    try {
      const response = await axios.get(`${this.baseUrl}/tv/popular`, {
        params: {
          api_key: this.accessToken,
          page,
          language,
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "TMDB Popular Series Error:",
        error.response?.data || error.message
      );
      throw new HttpException(
        "Error al obtener series populares de TMDB",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  getFullImageUrl(path: string, size = "original") {
    if (!path) return null;
    return `${this.imageBaseUrl}/${size}${path}`;
  }
}
