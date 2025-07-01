import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async createRefreshToken(userId: number, expiresIn: number, deviceInfo?: string, ipAddress?: string): Promise<string> {
    // Generar un token único
    const token = uuidv4();
    
    // Calcular la fecha de expiración
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + expiresIn * 1000);
    
    // Crear el registro en la base de datos
    await this.refreshTokenRepository.save({
      user_id: userId,
      token: await bcrypt.hash(token, 10), // Guardar el hash del token, no el token en sí
      expires_at: expiresAt,
      device_info: deviceInfo,
      ip_address: ipAddress,
    });
    
    return token;
  }

  async validateRefreshToken(userId: number, token: string): Promise<boolean> {
    // Buscar tokens activos para el usuario
    const now = new Date();
    const refreshTokens = await this.refreshTokenRepository.find({
      where: {
        user_id: userId,
        revoked: false,
        expires_at: LessThan(now),
      },
    });
    
    // Verificar si alguno de los tokens coincide
    for (const refreshToken of refreshTokens) {
      const isValid = await bcrypt.compare(token, refreshToken.token);
      if (isValid) {
        return true;
      }
    }
    
    return false;
  }

  async revokeRefreshToken(userId: number, token: string): Promise<void> {
    // Buscar tokens activos para el usuario
    const refreshTokens = await this.refreshTokenRepository.find({
      where: {
        user_id: userId,
        revoked: false,
      },
    });
    
    // Revocar el token específico
    for (const refreshToken of refreshTokens) {
      const isValid = await bcrypt.compare(token, refreshToken.token);
      if (isValid) {
        await this.refreshTokenRepository.update(refreshToken.id, { revoked: true });
        break;
      }
    }
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    // Revocar todos los tokens del usuario
    await this.refreshTokenRepository.update(
      { user_id: userId, revoked: false },
      { revoked: true }
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    // Eliminar tokens expirados más antiguos que 7 días
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    await this.refreshTokenRepository.delete({
      expires_at: LessThan(cutoffDate),
    });
  }
} 