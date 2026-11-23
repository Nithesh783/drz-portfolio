import {
  IsEmail,
  IsIn,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export const enquiryServices = [
  "Custom Software Development",
  "Web Application Development",
  "Mobile App Development",
  "UI/UX Design",
  "E-commerce Development",
  "Maintenance & Support",
  "Other",
] as const;

export const enquiryBudgetRanges = [
  "Under ₹1 Lakh",
  "₹1 - ₹3 Lakhs",
  "₹3 - ₹10 Lakhs",
  "₹10 Lakhs+",
] as const;

export class CreateEnquiryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: "Phone must be exactly 10 digits." })
  phone!: string;

  @IsString()
  @IsIn(enquiryServices)
  serviceRequired!: string;

  @IsOptional()
  @IsIn(enquiryBudgetRanges)
  budgetRange?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MinLength(5)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;
}
