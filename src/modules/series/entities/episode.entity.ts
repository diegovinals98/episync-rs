import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Series } from "./series.entity";

@Entity("episodes")
export class Episode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  series_id: number;

  @Column()
  tmdb_id: number;

  @Column()
  season_number: number;

  @Column()
  episode_number: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  overview: string;

  @Column({ length: 255, nullable: true })
  still_path: string;

  @Column({ type: "date", nullable: true })
  air_date: Date;

  @Column({ type: "decimal", precision: 3, scale: 1, default: 0 })
  vote_average: number;

  @Column({ default: 0 })
  vote_count: number;

  @Column({ nullable: true })
  runtime: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;

  @ManyToOne(() => Series, (series) => series.episodes)
  @JoinColumn({ name: "series_id" })
  series: Series;
}
