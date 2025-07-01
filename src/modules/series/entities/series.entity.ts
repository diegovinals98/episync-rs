import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { GroupSeries } from '@/modules/groups/entities/group-series.entity';

@Entity('series')
export class Series {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tmdb_id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  overview: string;

  @Column({ length: 255, nullable: true })
  poster_path: string;

  @Column({ length: 255, nullable: true })
  backdrop_path: string;

  @Column({ type: 'date', nullable: true })
  first_air_date: Date;

  @Column({ nullable: true })
  number_of_seasons: number;

  @Column({ nullable: true })
  number_of_episodes: number;

  @Column({ type: 'simple-json', nullable: true })
  genres: { id: number, name: string }[];

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  vote_average: number;

  @Column({ default: 0 })
  vote_count: number;

  @Column({ default: false })
  is_popular: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => GroupSeries, groupSeries => groupSeries.series)
  groups: GroupSeries[];
} 