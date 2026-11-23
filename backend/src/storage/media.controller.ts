import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { Response } from "express";
import { StorageService } from "./storage.service";

@Controller("media")
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get()
  async getImage(
    @Query("key") key: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const image = await this.storage.getObject(key ?? "");
    response.setHeader("Content-Type", image.contentType);
    response.setHeader(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Disposition", "inline");
    if (image.contentLength !== undefined) {
      response.setHeader("Content-Length", image.contentLength);
    }
    if (image.etag) response.setHeader("ETag", image.etag);
    return new StreamableFile(image.body);
  }
}
