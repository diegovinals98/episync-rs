import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { GroupActivity } from "./group-activity.entity";
import { GroupMember } from "./group-member.entity";
import { GroupSeries } from "./group-series.entity";

@Entity("groups")
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ length: 1000, nullable: true })
  image_url: string;

  @Column({ default: false })
  is_private: boolean;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @OneToMany(() => GroupSeries, (groupSeries) => groupSeries.group)
  series: GroupSeries[];

  @OneToMany(() => GroupActivity, (activity) => activity.group)
  activities: GroupActivity[];
}
