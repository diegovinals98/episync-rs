import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Group } from './group.entity';
import { Series } from '../../series/entities/series.entity';

@Entity('group_series')
export class GroupSeries {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  group_id: number;

  @Column()
  series_id: number;

  @Column({ default: false })
  is_active: boolean;

  @Column({ nullable: true })
  added_by_user_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  added_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @ManyToOne(() => Group, group => group.series)
  group: Group;

  @ManyToOne(() => Series, series => series.groups)
  series: Series;
} 