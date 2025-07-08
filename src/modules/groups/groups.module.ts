import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationsModule } from "../notifications/notifications.module";
import { Series } from "../series/entities/series.entity";
import { UserEpisode } from "../series/entities/user-episode.entity";
import { SeriesModule } from "../series/series.module";
import { UsersModule } from "../users/users.module";
import { WebSocketsModule } from "../websockets/websockets.module";
import { Comment } from "./entities/comment.entity";
import { GroupActivity } from "./entities/group-activity.entity";
import { GroupMember } from "./entities/group-member.entity";
import { GroupSeries } from "./entities/group-series.entity";
import { Group } from "./entities/group.entity";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      GroupMember,
      GroupSeries,
      GroupActivity,
      Series,
      UserEpisode,
      Comment,
    ]),
    UsersModule,
    SeriesModule,
    NotificationsModule,
    forwardRef(() => WebSocketsModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
