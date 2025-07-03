import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class AddSeriesDto {
  @ApiProperty({
    description: "TMDB ID de la serie",
    example: 1399,
  })
  @IsNotEmpty({ message: "El tmdb_id es requerido" })
  @IsNumber({}, { message: "El tmdb_id debe ser un número" })
  tmdb_id: number;

  @ApiProperty({
    description: "Nombre de la serie",
    example: "Game of Thrones",
  })
  @IsNotEmpty({ message: "El nombre de la serie es requerido" })
  @IsString({ message: "El nombre debe ser una cadena de texto" })
  name: string;

  @ApiProperty({
    description: "Descripción de la serie",
    example:
      "Seven noble families fight for control of the mythical land of Westeros...",
  })
  @IsNotEmpty({ message: "La descripción de la serie es requerida" })
  @IsString({ message: "La descripción debe ser una cadena de texto" })
  overview: string;

  @ApiProperty({
    description: "Ruta del poster de la serie",
    example: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
  })
  @IsOptional()
  @IsString({ message: "El poster_path debe ser una cadena de texto" })
  poster_path?: string;

  @ApiPropertyOptional({
    description: "URL completa del poster de la serie",
    example: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
  })
  @IsOptional()
  @IsString({ message: "El poster_url debe ser una cadena de texto" })
  poster_url?: string;

  @ApiProperty({
    description: "Ruta del backdrop de la serie",
    example: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg",
  })
  @IsOptional()
  @IsString({ message: "El backdrop_path debe ser una cadena de texto" })
  backdrop_path?: string;

  @ApiProperty({
    description: "Fecha de primera emisión",
    example: "2011-04-17",
  })
  @IsOptional()
  @IsDateString({}, { message: "La fecha debe tener formato válido" })
  first_air_date?: string;

  @ApiProperty({
    description: "Puntuación media de la serie",
    example: 8.5,
  })
  @IsOptional()
  @IsNumber({}, { message: "La puntuación debe ser un número" })
  vote_average?: number;

  @ApiProperty({
    description: "Número de votos",
    example: 25191,
  })
  @IsOptional()
  @IsNumber({}, { message: "El número de votos debe ser un número" })
  vote_count?: number;

  @ApiPropertyOptional({
    description: "Popularidad de la serie",
    example: 100.5,
  })
  @IsOptional()
  @IsNumber({}, { message: "La popularidad debe ser un número" })
  popularity?: number;

  @ApiPropertyOptional({
    description: "ID del usuario que agrega la serie",
    example: 123,
  })
  @IsOptional()
  @IsNumber({}, { message: "El ID del usuario debe ser un número" })
  added_by_user_id?: number;
}
