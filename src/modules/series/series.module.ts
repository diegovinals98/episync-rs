import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupActivity } from "../groups/entities/group-activity.entity";
import { GroupMember } from "../groups/entities/group-member.entity";
import { WebSocketsModule } from "../websockets/websockets.module";
import { Episode } from "./entities/episode.entity";
import { Series } from "./entities/series.entity";
import { UserEpisode } from "./entities/user-episode.entity";
import { EpisodesService } from "./episodes.service";
import { TmdbService } from "./tmdb.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Series,
      Episode,
      UserEpisode,
      GroupActivity,
      GroupMember,
    ]),
    forwardRef(() => WebSocketsModule),
  ],
  controllers: [],
  providers: [TmdbService, EpisodesService],
  exports: [TmdbService, EpisodesService],
})
export class SeriesModule {}
