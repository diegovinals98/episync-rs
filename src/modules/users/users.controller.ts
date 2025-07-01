import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { SearchUsersDto } from './dto/search-users.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar usuarios por nombre, apellido, username o email' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda', example: 'maria' })
  @ApiQuery({ name: 'page', description: 'Número de página', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: 'Resultados por página', example: 10, required: false })
  @ApiResponse({
    status: 200,
    description: 'Usuarios encontrados',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Usuarios encontrados' },
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 2 },
                  username: { type: 'string', example: 'mariavinals' },
                  name: { type: 'string', example: 'María' },
                  lastname: { type: 'string', example: 'Viñals' },
                  email: { type: 'string', example: 'maria@example.com' },
                  avatar_url: { type: 'string', nullable: true, example: null },
                  created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
                  updated_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
                },
              },
            },
            total: { type: 'number', example: 2 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 400, description: 'Parámetros de búsqueda inválidos' })
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    const result = await this.usersService.searchUsers(searchDto);
    
    return {
      success: true,
      message: 'Usuarios encontrados',
      data: result,
    };
  }
} 