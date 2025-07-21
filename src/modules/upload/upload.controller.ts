import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { S3UploadService } from "../users/s3-upload.service";

@ApiTags("Upload")
@Controller("upload")
export class UploadController {
  constructor(private readonly s3UploadService: S3UploadService) {}

  @Post("group-image")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Subir imagen de grupo" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({
    status: 200,
    description: "Imagen de grupo subida correctamente",
    schema: {
      properties: {
        success: { type: "boolean", example: true },
        status: { type: "number", example: 200 },
        message: {
          type: "string",
          example: "Imagen de grupo subida correctamente",
        },
        data: {
          type: "object",
          properties: {
            image_url: {
              type: "string",
              example:
                "https://tu-bucket-s3.s3.amazonaws.com/groups/group-photos/group-123-photo.jpg",
            },
            filename: { type: "string", example: "group-123-photo.jpg" },
            size: { type: "number", example: 245760 },
            mime_type: { type: "string", example: "image/jpeg" },
            uploaded_at: {
              type: "string",
              format: "date-time",
              example: "2025-01-21T10:30:45.123Z",
            },
          },
        },
        error: { type: "null", example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Error al subir la imagen del grupo",
    schema: {
      properties: {
        success: { type: "boolean", example: false },
        status: { type: "number", example: 400 },
        message: {
          type: "string",
          example: "Error al subir la imagen del grupo",
        },
        data: { type: "null", example: null },
        error: {
          type: "object",
          properties: {
            code: { type: "string", example: "INVALID_FILE_TYPE" },
            details: {
              type: "string",
              example: "Solo se permiten imágenes JPEG, PNG o GIF",
            },
          },
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("groupImage"))
  async uploadGroupImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
    try {
      const userId = req.user["id"];

      if (!file) {
        throw new BadRequestException("No se proporcionó ningún archivo");
      }

      // Usar un ID temporal para generar el nombre del archivo
      const tempGroupId = Date.now();

      // Subir imagen a S3
      const uploadResult = await this.s3UploadService.uploadGroupImage(
        file,
        tempGroupId
      );

      return {
        success: true,
        status: 200,
        message: "Imagen de grupo subida correctamente",
        data: uploadResult,
        error: null,
      };
    } catch (error) {
      let errorCode = "UPLOAD_ERROR";
      let errorDetails = "Error al subir la imagen del grupo";

      if (error.message === "INVALID_FILE_TYPE") {
        errorCode = "INVALID_FILE_TYPE";
        errorDetails = "Solo se permiten imágenes JPEG, PNG o GIF";
      } else if (error.message === "FILE_TOO_LARGE") {
        errorCode = "FILE_TOO_LARGE";
        errorDetails = "El archivo es demasiado grande. Máximo 5MB";
      }

      return {
        success: false,
        status: 400,
        message: "Error al subir la imagen del grupo",
        data: null,
        error: {
          code: errorCode,
          details: errorDetails,
        },
      };
    }
  }
}
