import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Series } from './entities/series.entity';
import { Episode } from './entities/episode.entity';
import { UserEpisode } from './entities/user-episode.entity';
import { TmdbService } from './tmdb.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Series,
      Episode,
      UserEpisode,
    ]),
  ],
  controllers: [],
  providers: [TmdbService],
  exports: [TmdbService],
})
export class SeriesModule {} 