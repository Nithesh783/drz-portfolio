import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./modules/health/health.module";
import { AdminModule } from "./modules/admin/admin.module";
import { EnquiriesModule } from "./modules/enquiries/enquiries.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../.env", ".env"],
    }),
    StorageModule,
    PrismaModule,
    HealthModule,
    ProjectsModule,
    EnquiriesModule,
    AdminModule,
  ],
})
export class AppModule {}
