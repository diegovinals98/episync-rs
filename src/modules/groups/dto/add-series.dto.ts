import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class AddSeriesDto {
  @ApiProperty({
    description: "ID de la serie (TMDB ID)",
    example: 1399,
  })
  @IsNotEmpty({ message: "El ID de la serie es requerido" })
  @IsNumber({}, { message: "El ID de la serie debe ser un número" })
  seriesId: number;

  @ApiPropertyOptional({
    description: "ID del usuario que agrega la serie",
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: "El ID del usuario debe ser un número" })
  addedByUserId?: number;
}
