import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Series } from "../series/entities/series.entity";
import { UsersModule } from "../users/users.module";
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
    ]),
    UsersModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
