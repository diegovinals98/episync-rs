import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TmdbService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly imageBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('tmdb.apiKey');
    this.baseUrl = 'https://api.themoviedb.org/3';
    this.imageBaseUrl = 'https://image.tmdb.org/t/p';
  }

  async searchSeries(query: string, page = 1, language = 'es-ES') {
    try {
      const response = await axios.get(`${this.baseUrl}/search/tv`, {
        params: {
          api_key: this.apiKey,
          query,
          page,
          language,
        },
      });
      
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al buscar series en TMDB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSeriesDetails(seriesId: number, language = 'es-ES') {
    try {
      const response = await axios.get(`${this.baseUrl}/tv/${seriesId}`, {
        params: {
          api_key: this.apiKey,
          language,
          append_to_response: 'credits,videos,images,external_ids',
        },
      });
      
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al obtener detalles de la serie en TMDB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSeriesSeasons(seriesId: number, seasonNumber: number, language = 'es-ES') {
    try {
      const response = await axios.get(`${this.baseUrl}/tv/${seriesId}/season/${seasonNumber}`, {
        params: {
          api_key: this.apiKey,
          language,
        },
      });
      
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al obtener temporada de la serie en TMDB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSeriesEpisode(seriesId: number, seasonNumber: number, episodeNumber: number, language = 'es-ES') {
    try {
      const response = await axios.get(`${this.baseUrl}/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`, {
        params: {
          api_key: this.apiKey,
          language,
        },
      });
      
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al obtener episodio de la serie en TMDB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPopularSeries(page = 1, language = 'es-ES') {
    try {
      const response = await axios.get(`${this.baseUrl}/tv/popular`, {
        params: {
          api_key: this.apiKey,
          page,
          language,
        },
      });
      
      return response.data;
    } catch (error) {
      throw new HttpException(
        'Error al obtener series populares de TMDB',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  getFullImageUrl(path: string, size = 'original') {
    if (!path) return null;
    return `${this.imageBaseUrl}/${size}${path}`;
  }
} 