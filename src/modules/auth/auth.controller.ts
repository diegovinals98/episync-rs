import { Controller, Post, Body, Req, UseGuards, HttpCode, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado correctamente',
    schema: {
      example: {
        success: true,
        message: 'Usuario registrado correctamente',
        data: {
          user: {
            id: 1,
            username: 'usuario_ejemplo',
            name: 'Juan',
            lastname: 'Pérez',
            email: 'juan.perez@ejemplo.com',
            avatar_url: null,
            role: 'user',
            email_verified: false,
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'El usuario o email ya existe' })
  register(
    @Body() registerDto: RegisterDto, 
    @Headers('user-agent') userAgent: string,
    @Req() request: Request
  ) {
    const ipAddress = request.ip;
    return this.authService.register(registerDto, userAgent, ipAddress);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar tokens de autenticación' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados exitosamente',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tokens refreshed successfully' },
        data: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                username: { type: 'string' },
                name: { type: 'string' },
                lastname: { type: 'string' },
                email: { type: 'string' },
                avatar_url: { type: 'string', nullable: true },
                role: { type: 'string' },
                email_verified: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token de refresco inválido o expirado' })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
  ) {
    // Obtener información del dispositivo y dirección IP
    const deviceInfo = request.headers['user-agent'] || '';
    const ipAddress = request.ip || '';

    return this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      deviceInfo,
      ipAddress,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada correctamente',
    schema: {
      example: {
        success: true,
        message: 'Sesión cerrada correctamente',
      },
    },
  })
  logout(@Req() req: any, @Body('refreshToken') refreshToken: string) {
    const userId = req.user.id;
    return this.authService.logout(userId, refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar todas las sesiones' })
  @ApiResponse({
    status: 200,
    description: 'Todas las sesiones cerradas correctamente',
    schema: {
      example: {
        success: true,
        message: 'Todas las sesiones cerradas correctamente',
      },
    },
  })
  logoutAll(@Req() req: any) {
    const userId = req.user.id;
    return this.authService.logoutAll(userId);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      example: {
        success: true,
        message: 'Login exitoso',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: '311745d7-18fe-41b5-88bf-3176d97d056c',
          user: {
            id: 4,
            username: 'diego98v',
            name: 'Diego',
            lastname: 'Viñals',
            email: 'diego.vinalslage@gmail.com',
            avatar_url: null,
            role: 'user',
            email_verified: false,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Req() request: Request
  ) {
    const ipAddress = request.ip;
    return this.authService.login(loginDto.email, loginDto.password, userAgent, ipAddress);
  }
} 