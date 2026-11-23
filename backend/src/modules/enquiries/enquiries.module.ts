import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { AdminEnquiriesController } from "./admin-enquiries.controller";
import { EnquiriesController } from "./enquiries.controller";
import { EnquiriesService } from "./enquiries.service";

@Module({
  imports: [AdminModule],
  controllers: [EnquiriesController, AdminEnquiriesController],
  providers: [EnquiriesService],
})
export class EnquiriesModule {}
