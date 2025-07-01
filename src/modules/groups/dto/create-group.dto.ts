import { IsNotEmpty, IsString, IsOptional, IsArray, IsNumber, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ 
    description: 'Nombre del grupo',
    example: 'Familia Viñals'
  })
  @IsNotEmpty({ message: 'El nombre del grupo es requerido' })
  @IsString({ message: 'El nombre debe ser un texto' })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Descripción del grupo',
    example: 'Grupo para compartir series con la familia'
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'IDs de los usuarios que serán miembros del grupo',
    example: [2, 3, 4],
    type: [Number]
  })
  @IsOptional()
  @IsArray({ message: 'Los miembros deben ser un array' })
  @IsNumber({}, { each: true, message: 'Cada ID de miembro debe ser un número' })
  members?: number[];

  @ApiPropertyOptional({ 
    description: 'URL de la imagen del grupo',
    example: 'https://example.com/images/group-photo.jpg'
  })
  @IsOptional()
  @IsUrl({}, { message: 'La URL de la imagen debe ser válida' })
  image_url?: string;
} 