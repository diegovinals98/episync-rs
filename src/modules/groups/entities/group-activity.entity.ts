import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Group } from "./group.entity";

@Entity("group_activity")
export class GroupActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  group_id: number;

  @Column()
  user_id: number;

  @Column({
    type: "enum",
    enum: [
      "user_joined",
      "user_left",
      "series_added",
      "series_removed",
      "episode_watched",
      "episode_rated",
      "comment_added",
    ],
  })
  type: string;

  @Column({ nullable: true })
  series_id: number;

  @Column({ length: 255, nullable: true })
  series_name: string;

  @Column({ nullable: true })
  episode_id: number;

  @Column({ length: 255, nullable: true })
  episode_name: string;

  @Column({ type: "text", nullable: true })
  comment: string;

  @Column({ type: "decimal", precision: 3, scale: 1, nullable: true })
  rating: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @ManyToOne(() => Group, (group) => group.activities, { onDelete: "CASCADE" })
  @JoinColumn({ name: "group_id" })
  group: Group;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
