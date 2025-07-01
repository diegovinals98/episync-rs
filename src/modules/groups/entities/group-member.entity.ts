import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Group } from "./group.entity";

@Entity("group_members")
export class GroupMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  group_id: number;

  @Column({
    type: "enum",
    enum: ["admin", "moderator", "member"],
    default: "member",
  })
  role: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: "timestamp" })
  joined_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: "CASCADE" })
  @JoinColumn({ name: "group_id" })
  group: Group;
}
