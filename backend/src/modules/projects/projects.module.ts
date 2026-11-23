import { Module } from "@nestjs/common";
import { AdminProjectsController } from "./admin-projects.controller";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { AdminModule } from "../admin/admin.module";
import { StorageModule } from "../../storage/storage.module";

@Module({
  imports: [AdminModule, StorageModule],
  controllers: [ProjectsController, AdminProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}