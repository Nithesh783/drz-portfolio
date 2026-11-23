import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ServiceUnavailableException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminAuthGuard } from "../admin/admin-auth.guard";
import { StorageService } from "../../storage/storage.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { getImageDimensions } from "./image-dimensions";
import { UpdateHomepageProjectsDto } from "./dto/update-homepage-projects.dto";
import { ProjectsService } from "./projects.service";

interface UploadedImageFile {
  buffer: Buffer;
}

function getImageExtension(buffer: Buffer): "jpg" | "png" | "webp" | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

@Controller("admin/projects")
@UseGuards(AdminAuthGuard)
export class AdminProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get("homepage")
  findHomepage() {
    return this.projectsService.findHomepage();
  }

  @Patch("homepage")
  updateHomepage(@Body() body: UpdateHomepageProjectsDto) {
    return this.projectsService.updateHomepage(body.projectIds);
  }

  @Post()
  create(@Body() data: CreateProjectDto) {
    return this.projectsService.create(data);
  }

  @Post("images")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  uploadImage(@UploadedFile() file?: UploadedImageFile) {
    return this.storeImage(file, true);
  }

  @Post("background-images")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  uploadBackgroundImage(@UploadedFile() file?: UploadedImageFile) {
    return this.storeImage(file, false);
  }

  private async storeImage(
    file: UploadedImageFile | undefined,
    requirePortrait: boolean,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("Choose an image to upload.");
    }

    const extension = getImageExtension(file.buffer);
    if (!extension) {
      throw new BadRequestException("Only JPEG, PNG, and WebP images are supported.");
    }

    const dimensions = getImageDimensions(file.buffer);
    if (!dimensions) {
      throw new BadRequestException("Choose a valid JPEG, PNG, or WebP image.");
    }
    if (requirePortrait && dimensions.height <= dimensions.width) {
      throw new BadRequestException(
        "Project images must be portrait, with a greater height than width.",
      );
    }

    const key = this.storage.createProjectImageKey(
      requirePortrait ? "images" : "backgrounds",
      extension,
    );
    const contentType = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    }[extension];
    await this.storage.upload(key, file.buffer, contentType, file.buffer.length);
    if (!(await this.storage.hasObject(key))) {
      throw new ServiceUnavailableException(
        "Image storage did not confirm the uploaded image.",
      );
    }

    return {
      imageUrl: this.storage.publicImageReference(key),
    };
  }

  @Put(":id")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() data: CreateProjectDto,
  ) {
    return this.projectsService.update(id, data);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<void> {
    return this.projectsService.remove(id);
  }
}
