import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AdminAuthGuard } from "../admin/admin-auth.guard";
import { UpdateEnquiryStatusDto } from "./dto/update-enquiry-status.dto";
import { EnquiriesService } from "./enquiries.service";

@Controller("admin/enquiries")
@UseGuards(AdminAuthGuard)
export class AdminEnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Get()
  findAll() {
    return this.enquiriesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.enquiriesService.findOne(id);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateEnquiryStatusDto,
  ) {
    return this.enquiriesService.updateStatus(id, body.status);
  }

  @Delete(":id")
  delete(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.enquiriesService.delete(id);
  }
}
