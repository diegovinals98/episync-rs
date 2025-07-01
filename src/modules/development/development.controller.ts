import { Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DevelopmentService } from "./development.service";

@ApiTags("Development")
@Controller("development")
export class DevelopmentController {
  constructor(private readonly developmentService: DevelopmentService) {}

  @Post("seed-users")
  @ApiOperation({
    summary: "Insertar 10 usuarios de prueba con nombres reales",
  })
  @ApiResponse({
    status: 201,
    description: "Usuarios de prueba insertados correctamente",
    schema: {
      properties: {
        message: { type: "string", example: "Datos de prueba procesados" },
        created: {
          type: "array",
          items: { type: "string" },
          example: ["diegovinals", "mariavinals", "carlosgarcia"],
        },
        existing: {
          type: "array",
          items: { type: "string" },
          example: [],
        },
        totalCreated: { type: "number", example: 10 },
        totalExisting: { type: "number", example: 0 },
      },
    },
  })
  async seedUsers() {
    return this.developmentService.seedUsers();
  }
}
