import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export enum NotificationType {
  EPISODE_WATCHED = "episode_watched",
  COMMENT_ADDED = "comment_added",
  SERIES_ADDED = "series_added",
  SERIES_REMOVED = "series_removed",
  GROUP_CREATED = "group_created",
}

export class TestNotificationDto {
  @ApiProperty({
    description: "Token Expo Push del dispositivo",
    example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  })
  @IsNotEmpty()
  @IsString()
  expo_push_token: string;

  @ApiProperty({
    description: "Tipo de notificación a enviar",
    enum: NotificationType,
    example: NotificationType.EPISODE_WATCHED,
  })
  @IsNotEmpty()
  @IsEnum(NotificationType)
  notification_type: NotificationType;
}
