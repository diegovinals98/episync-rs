import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comment } from "../groups/entities/comment.entity";
import { GroupActivity } from "../groups/entities/group-activity.entity";
import { GroupsModule } from "../groups/groups.module";
import { SeriesModule } from "../series/series.module";
import { WebSocketAuthGuard } from "./websocket-auth.guard";
import { WsExceptionFilter } from "./websocket-exception.filter";
import { WebSocketsGateway } from "./websockets.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, GroupActivity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "24h" },
    }),
    forwardRef(() => SeriesModule),
    forwardRef(() => GroupsModule),
  ],
  providers: [WebSocketsGateway, WebSocketAuthGuard, WsExceptionFilter],
  exports: [WebSocketsGateway],
})
export class WebSocketsModule {}
