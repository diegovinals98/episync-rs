import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Series } from "../../series/entities/series.entity";
import { User } from "../../users/entities/user.entity";
import { Group } from "./group.entity";

@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  group_id: number;

  @Column()
  series_id: number;

  @Column()
  user_id: number;

  @Column("text")
  message: string;

  @Column({ nullable: true })
  reply_to: number;

  @CreateDateColumn({ type: "timestamp", precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", precision: 6 })
  updated_at: Date;

  @ManyToOne(() => Group, { onDelete: "CASCADE" })
  @JoinColumn({ name: "group_id" })
  group: Group;

  @ManyToOne(() => Series, { onDelete: "CASCADE" })
  @JoinColumn({ name: "series_id" })
  series: Series;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Comment, { onDelete: "SET NULL" })
  @JoinColumn({ name: "reply_to" })
  parent: Comment;
}
