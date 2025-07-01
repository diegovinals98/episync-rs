import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
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

  async findTokenRecord(userId: number, token: string): Promise<RefreshToken | null> {
    // Buscar tokens activos para el usuario
    const refreshTokens = await this.refreshTokenRepository.find({
      where: {
        user_id: userId,
        revoked: false,
        expires_at: MoreThan(new Date()), // No expirados
      },
    });
    
    // Verificar si alguno de los tokens coincide
    for (const refreshToken of refreshTokens) {
      const isValid = await bcrypt.compare(token, refreshToken.token);
      if (isValid) {
        return refreshToken;
      }
    }
    
    return null;
  }

  async validateRefreshToken(userId: number, token: string): Promise<boolean> {
    const tokenRecord = await this.findTokenRecord(userId, token);
    return tokenRecord !== null;
  }

  async validateAndRotateToken(token: string, deviceInfo?: string, ipAddress?: string): Promise<{ userId: number, newToken: string }> {
    // Buscar todos los tokens no revocados
    const allTokens = await this.refreshTokenRepository.find({
      where: {
        revoked: false,
      },
    });
    
    // Buscar el token específico
    let foundToken: RefreshToken | null = null;
    let userId: number | null = null;
    
    for (const refreshToken of allTokens) {
      const isValid = await bcrypt.compare(token, refreshToken.token);
      if (isValid) {
        foundToken = refreshToken;
        userId = refreshToken.user_id;
        break;
      }
    }
    
    // Si no se encuentra el token o está expirado
    if (!foundToken || foundToken.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    
    // Revocar el token actual
    await this.refreshTokenRepository.update(foundToken.id, { 
      revoked: true,
      updated_at: new Date()
    });
    
    // Crear un nuevo token (rotación de tokens)
    const expiresIn = 7 * 24 * 60 * 60; // 7 días en segundos
    const newToken = await this.createRefreshToken(userId, expiresIn, deviceInfo, ipAddress);
    
    return { userId, newToken };
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
        await this.refreshTokenRepository.update(refreshToken.id, { 
          revoked: true,
          updated_at: new Date()
        });
        break;
      }
    }
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    // Revocar todos los tokens del usuario
    await this.refreshTokenRepository.update(
      { user_id: userId, revoked: false },
      { revoked: true, updated_at: new Date() }
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    // Eliminar tokens expirados más antiguos que 30 días
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    await this.refreshTokenRepository.delete({
      expires_at: LessThan(cutoffDate),
    });
  }
} 