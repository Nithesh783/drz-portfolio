import { Body, Controller, Post } from "@nestjs/common";
import { CreateEnquiryDto } from "./dto/create-enquiry.dto";
import { EnquiriesService } from "./enquiries.service";

@Controller("enquiries")
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post()
  create(@Body() body: CreateEnquiryDto) {
    return this.enquiriesService.create(body);
  }
}
