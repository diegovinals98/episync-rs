import { User } from "@/modules/users/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Episode } from "./episode.entity";

@Entity("user_episodes")
export class UserEpisode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  episode_id: number;

  @Column()
  series_id: number;

  @Column({ default: true })
  watched: boolean;

  @Column({ type: "decimal", precision: 3, scale: 1, nullable: true })
  rating: number;

  @Column({ type: "text", nullable: true })
  comment: string;

  @CreateDateColumn({ type: "timestamp" })
  watched_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Episode)
  @JoinColumn({ name: "episode_id" })
  episode: Episode;
}
