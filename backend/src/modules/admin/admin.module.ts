import { Module } from "@nestjs/common";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthGuard } from "./admin-auth.guard";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AdminAuthController],
  providers: [AuthService, AdminAuthGuard],
  exports: [AuthService, AdminAuthGuard],
})
export class AdminModule {}
