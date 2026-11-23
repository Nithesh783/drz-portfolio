import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateEnquiryDto,
  enquiryBudgetRanges,
  enquiryServices,
} from "./dto/create-enquiry.dto";
import { enquiryStatuses } from "./dto/update-enquiry-status.dto";

@Injectable()
export class EnquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEnquiryDto) {
    const name = data.name.trim();
    const companyName = data.companyName?.trim();
    const email = data.email.trim();
    const phone = data.phone.trim();
    const serviceRequired = data.serviceRequired.trim();
    const budgetRange = data.budgetRange?.trim();
    const message = data.message.trim();
    if (
      name.length < 2 ||
      (companyName?.length ?? 0) > 160 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
      !/^\d{10}$/.test(phone) ||
      !enquiryServices.some((service) => service === serviceRequired) ||
      (budgetRange !== undefined &&
        !enquiryBudgetRanges.some((range) => range === budgetRange)) ||
      message.length < 5
    ) {
      throw new BadRequestException(
        "Please provide valid enquiry details, including a service, email, mobile number, and description.",
      );
    }

    if (data.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: data.projectId },
        select: { id: true },
      });
      if (!project) {
        throw new BadRequestException("The selected project does not exist.");
      }
    }

    return this.prisma.enquiry.create({
      data: {
        name,
        companyName: companyName || null,
        email: data.email.trim().toLowerCase(),
        phone,
        serviceRequired,
        budgetRange: budgetRange || null,
        message,
        projectId: data.projectId || null,
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  findAll() {
    return this.prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, projectName: true, projectLink: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const enquiry = await this.prisma.enquiry.findUnique({
      where: { id },
      include: { project: { select: { projectName: true } } },
    });
    if (!enquiry) throw new NotFoundException("Enquiry not found.");
    return enquiry;
  }

  async updateStatus(id: string, status: string) {
    if (!enquiryStatuses.includes(status as (typeof enquiryStatuses)[number])) {
      throw new BadRequestException("Invalid enquiry status.");
    }
    if (
      !(await this.prisma.enquiry.findUnique({
        where: { id },
        select: { id: true },
      }))
    ) {
      throw new NotFoundException("Enquiry not found.");
    }
    return this.prisma.enquiry.update({ where: { id }, data: { status } });
  }

  async delete(id: string) {
    if (
      !(await this.prisma.enquiry.findUnique({
        where: { id },
        select: { id: true },
      }))
    ) {
      throw new NotFoundException("Enquiry not found.");
    }

    return this.prisma.enquiry.delete({
      where: { id },
      select: { id: true },
    });
  }
}
