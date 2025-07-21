import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class S3UploadService {
  private readonly s3: AWS.S3;
  private readonly logger = new Logger(S3UploadService.name);

  constructor(private configService: ConfigService) {
    const awsConfig = this.configService.get("aws");

    if (
      !awsConfig?.accessKeyId ||
      !awsConfig?.secretAccessKey ||
      !awsConfig?.s3BucketName
    ) {
      this.logger.error(
        "AWS S3 configuration is missing. Please check your environment variables."
      );
      throw new Error("AWS S3 configuration is missing");
    }

    this.s3 = new AWS.S3({
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
      region: awsConfig.region,
    });

    this.logger.log(
      `S3UploadService initialized with bucket: ${awsConfig.s3BucketName}`
    );
  }

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: number
  ): Promise<{
    image_url: string;
    filename: string;
    size: number;
    mime_type: string;
    uploaded_at: Date;
  }> {
    try {
      // Validar tipo de archivo
      const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error("INVALID_FILE_TYPE");
      }

      // Validar tamaño (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error("FILE_TOO_LARGE");
      }

      // Generar nombre único para el archivo
      const fileExtension = file.originalname.split(".").pop();
      const filename = `user-${userId}-profile-photo-${uuidv4()}.${fileExtension}`;

      const bucketName = this.configService.get("aws.s3BucketName");

      // Configurar parámetros de subida
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: bucketName,
        Key: `users/profile-photos/${filename}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          "user-id": userId.toString(),
          "uploaded-at": new Date().toISOString(),
        },
      };

      // Subir archivo a S3
      const result = await this.s3.upload(uploadParams).promise();

      this.logger.log(
        `Imagen de perfil subida exitosamente para usuario ${userId}: ${result.Location}`
      );

      return {
        image_url: result.Location,
        filename,
        size: file.size,
        mime_type: file.mimetype,
        uploaded_at: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error subiendo imagen de perfil: ${error.message}`);
      throw error;
    }
  }

  async deleteProfileImage(imageUrl: string): Promise<void> {
    try {
      const bucketName = this.configService.get("aws.s3BucketName");

      // Extraer la clave del archivo de la URL
      const urlParts = imageUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      const key = `users/profile-photos/${filename}`;

      const deleteParams: AWS.S3.DeleteObjectRequest = {
        Bucket: bucketName,
        Key: key,
      };

      await this.s3.deleteObject(deleteParams).promise();

      this.logger.log(`Imagen de perfil eliminada: ${key}`);
    } catch (error) {
      this.logger.error(`Error eliminando imagen de perfil: ${error.message}`);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  async uploadGroupImage(
    file: Express.Multer.File,
    groupId: number
  ): Promise<{
    image_url: string;
    filename: string;
    size: number;
    mime_type: string;
    uploaded_at: Date;
  }> {
    try {
      // Validar tipo de archivo
      const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error("INVALID_FILE_TYPE");
      }

      // Validar tamaño (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error("FILE_TOO_LARGE");
      }

      // Generar nombre único para el archivo
      const fileExtension = file.originalname.split(".").pop();
      const filename = `group-${groupId}-photo-${uuidv4()}.${fileExtension}`;

      const bucketName = this.configService.get("aws.s3BucketName");

      // Configurar parámetros de subida
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: bucketName,
        Key: `groups/group-photos/${filename}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          "group-id": groupId.toString(),
          "uploaded-at": new Date().toISOString(),
        },
      };

      // Subir archivo a S3
      const result = await this.s3.upload(uploadParams).promise();

      this.logger.log(
        `Imagen de grupo subida exitosamente para grupo ${groupId}: ${result.Location}`
      );

      return {
        image_url: result.Location,
        filename,
        size: file.size,
        mime_type: file.mimetype,
        uploaded_at: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error subiendo imagen de grupo: ${error.message}`);
      throw error;
    }
  }

  async deleteGroupImage(imageUrl: string): Promise<void> {
    try {
      const bucketName = this.configService.get("aws.s3BucketName");

      // Extraer la clave del archivo de la URL
      const urlParts = imageUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      const key = `groups/group-photos/${filename}`;

      const deleteParams: AWS.S3.DeleteObjectRequest = {
        Bucket: bucketName,
        Key: key,
      };

      await this.s3.deleteObject(deleteParams).promise();

      this.logger.log(`Imagen de grupo eliminada: ${key}`);
    } catch (error) {
      this.logger.error(`Error eliminando imagen de grupo: ${error.message}`);
      // No lanzar error para no interrumpir el flujo principal
    }
  }
}
