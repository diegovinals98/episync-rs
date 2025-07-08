import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupMember } from "../groups/entities/group-member.entity";
import { UserPushToken } from "../users/entities/user-push-token.entity";
import { NotificationHelperService } from "./notification-helper.service";
import { NotificationsController } from "./notifications.controller";
import { PushNotificationService } from "./push-notification.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserPushToken, GroupMember])],
  controllers: [NotificationsController],
  providers: [PushNotificationService, NotificationHelperService],
  exports: [PushNotificationService, NotificationHelperService],
})
export class NotificationsModule {}
