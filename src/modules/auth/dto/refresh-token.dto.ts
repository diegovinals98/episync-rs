import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ 
    example: '311745d7-18fe-41b5-88bf-3176d97d056c', 
    description: 'Token de refresco obtenido durante el login o un refresh anterior' 
  })
  @IsNotEmpty({ message: 'El refresh token es requerido' })
  @IsString({ message: 'El refresh token debe ser un texto' })
  refreshToken: string;
} 