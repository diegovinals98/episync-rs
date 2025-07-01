import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenService } from './refresh-token.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async register(registerDto: RegisterDto, deviceInfo?: string, ipAddress?: string) {
    // Crear el usuario con un token de verificación
    const verificationToken = uuidv4();
    
    const user = await this.usersService.create({
      ...registerDto,
      verification_token: verificationToken,
      email_verified: false,
    });

    // Generar tokens
    const tokens = await this.getTokens(user.id, user.username, deviceInfo, ipAddress);

    // Actualizar último login
    await this.usersService.updateLastLogin(user.id);

    // Devolver respuesta
    return {
      success: true,
      message: 'Usuario registrado correctamente',
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          avatar_url: user.avatar_url,
          role: user.role,
          email_verified: user.email_verified,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async validateUser(username: string, password: string) {
    try {
      const user = await this.usersService.findByUsername(username);
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        const { password, ...result } = user;
        return result;
      }

      throw new UnauthorizedException('Credenciales inválidas');
    } catch (error) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
  }

  async getTokens(userId: number, username: string, deviceInfo?: string, ipAddress?: string) {
    // Obtener el usuario completo para incluir sus datos en el token
    const user = await this.usersService.findById(userId);

    const payload = {
      sub: userId,
      id: userId,
      username: user.username,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role,
      email_verified: user.email_verified
    };

    // Generar access token
    const accessToken = await this.jwtService.signAsync(
      payload,
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
    );

    // Generar refresh token y guardarlo en la base de datos
    const refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 días en segundos
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      userId,
      refreshTokenExpiresIn,
      deviceInfo,
      ipAddress
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string, deviceInfo?: string, ipAddress?: string) {
    try {
      // Validar y rotar el token
      const { userId, newToken } = await this.refreshTokenService.validateAndRotateToken(
        refreshToken,
        deviceInfo,
        ipAddress
      );
      
      // Obtener el usuario
      const user = await this.usersService.findById(userId);
      
      // Generar un nuevo access token
      const payload = {
        sub: userId,
        id: userId,
        username: user.username,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        email_verified: user.email_verified
      };
      
      const accessToken = await this.jwtService.signAsync(
        payload,
        {
          secret: this.configService.get('jwt.secret'),
          expiresIn: this.configService.get('jwt.expiresIn'),
        },
      );
      
      // Actualizar último login
      await this.usersService.updateLastLogin(userId);
      
      return {
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          accessToken,
          refreshToken: newToken,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            avatar_url: user.avatar_url,
            role: user.role,
            email_verified: user.email_verified,
          },
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to refresh tokens');
    }
  }

  async logout(userId: number, refreshToken: string) {
    // Revocar el token específico
    await this.refreshTokenService.revokeRefreshToken(userId, refreshToken);
    
    return {
      success: true,
      message: 'Sesión cerrada correctamente',
    };
  }

  async logoutAll(userId: number) {
    // Revocar todos los tokens del usuario
    await this.refreshTokenService.revokeAllUserTokens(userId);
    
    return {
      success: true,
      message: 'Todas las sesiones cerradas correctamente',
    };
  }

  async login(email: string, password: string, deviceInfo?: string, ipAddress?: string) {
    // Buscar el usuario por email
    const user = await this.usersService.findByEmail(email);
    
    // Verificar si el usuario existe
    if (!user) {
      throw new UnauthorizedException('User does not exist');
    }
    
    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }
    
    // Generar tokens
    const tokens = await this.getTokens(user.id, user.username, deviceInfo, ipAddress);
    
    // Actualizar último login
    await this.usersService.updateLastLogin(user.id);
    
    // Devolver respuesta
    return {
      success: true,
      message: 'Login exitoso',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          avatar_url: user.avatar_url,
          role: user.role,
          email_verified: user.email_verified,
        },
      },
    };
  }
} 