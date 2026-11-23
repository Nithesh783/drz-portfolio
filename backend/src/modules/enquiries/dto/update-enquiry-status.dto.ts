import { IsIn } from "class-validator";

export const enquiryStatuses = ["New", "In Progress", "Completed"] as const;

export class UpdateEnquiryStatusDto {
  @IsIn(enquiryStatuses)
  status!: (typeof enquiryStatuses)[number];
}
