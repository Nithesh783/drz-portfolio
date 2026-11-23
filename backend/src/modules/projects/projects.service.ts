import {
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../../storage/storage.service";
import { CreateProjectDto } from "./dto/create-project.dto";

type HomepagePositionedProject = {
  homepagePosition: number | null;
  images: string[];
  backgroundImage: string | null;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll() {
    const projects = await this.prisma.project.findMany({
      orderBy: { createdAt: "asc" },
    });
    return projects.map((project) => this.toPublicProject(project));
  }

  async findHomepage() {
    const projects = await this.prisma.project.findMany({
      where: { homepagePosition: { not: null } },
      orderBy: { homepagePosition: "asc" },
    });
    return this.toPublicHomepageSlots(projects);
  }

  async updateHomepage(projectIds: string[]) {
    const selectedProjectIds = projectIds.filter(Boolean);
    if (
      projectIds.length !== 8 ||
      new Set(selectedProjectIds).size !== selectedProjectIds.length
    ) {
      throw new BadRequestException(
        "Homepage selection must contain eight slots and distinct project IDs.",
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const existingProjects = await transaction.project.findMany({
        where: { id: { in: selectedProjectIds } },
        select: { id: true },
      });
      if (existingProjects.length !== selectedProjectIds.length) {
        throw new BadRequestException("All selected projects must exist.");
      }

      await transaction.project.updateMany({
        where: { homepagePosition: { not: null } },
        data: { homepagePosition: null },
      });
      for (const [index, id] of projectIds.entries()) {
        if (!id) continue;
        await transaction.project.update({
          where: { id },
          data: { homepagePosition: index + 1 },
        });
      }

      const savedProjects = await transaction.project.findMany({
        where: { homepagePosition: { not: null } },
        orderBy: { homepagePosition: "asc" },
      });
      return this.toPublicHomepageSlots(savedProjects);
    });
  }

  private toHomepageSlots<T extends HomepagePositionedProject>(
    projects: T[],
  ): (T | null)[] {
    const slots: (T | null)[] = Array.from({ length: 8 }, () => null);
    for (const project of projects) {
      if (project.homepagePosition !== null) {
        slots[project.homepagePosition - 1] = project;
      }
    }
    return slots;
  }

  private toPublicHomepageSlots<T extends HomepagePositionedProject>(
    projects: T[],
  ): (T | null)[] {
    return this.toHomepageSlots(projects).map((project) =>
      project ? this.toPublicProject(project) : null,
    );
  }

  async create(data: CreateProjectDto) {
    this.validateProjectData(data);
    const storedData = this.toStorageProjectData(data);
    await this.verifyImageObjects(storedData);
    const project = await this.prisma.project.create({ data: storedData });
    return this.toPublicProject(project);
  }

  async update(id: string, data: CreateProjectDto) {
    this.validateProjectData(data);
    const storedData = this.toStorageProjectData(data);
    await this.verifyImageObjects(storedData);
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true, images: true, backgroundImage: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
    const nextReferences = new Set([
      ...storedData.images,
      storedData.backgroundImage ?? "",
    ]);
    const removedImages = new Set(
      [...project.images, project.backgroundImage ?? ""].filter(
        (image) => image && !nextReferences.has(image),
      ),
    );
    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: storedData,
    });

    await this.deleteUnreferencedImages(
      [...removedImages],
      "Project was updated, but an unused image could not be deleted from storage.",
    );
    return this.toPublicProject(updatedProject);
  }

  async remove(id: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        homepagePosition: true,
        images: true,
        backgroundImage: true,
      },
    });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
    if (project.homepagePosition !== null) {
      const homepageProjectCount = await this.prisma.project.count({
        where: { homepagePosition: { not: null } },
      });
      const isRetiredAboutSlot =
        project.homepagePosition === 1 && homepageProjectCount === 9;
      if (!isRetiredAboutSlot) {
        throw new BadRequestException(
          "Remove this project from the homepage selection before deleting it.",
        );
      }
    }
    await this.prisma.project.delete({ where: { id } });
    await this.deleteUnreferencedImages(
      [...project.images, project.backgroundImage ?? ""].filter(Boolean),
      "Project was deleted, but an unused image could not be deleted from storage.",
    );
  }

  private validateProjectData(data: CreateProjectDto): void {
    if (data.images.length > 1 || data.images.some((image) => !image.trim())) {
      throw new BadRequestException(
        "Each project can have at most one portrait image reference.",
      );
    }
    if (!data.projectLink || !this.isHttpUrl(data.projectLink)) {
      throw new BadRequestException("Project link must be a valid HTTP(S) URL.");
    }
    for (const image of data.images) {
      this.validateImageReference(image);
    }
    if (data.backgroundImage) this.validateImageReference(data.backgroundImage);
  }

  private validateImageReference(reference: string): void {
    if (this.storage.isPreservedStaticImage(reference)) return;
    this.storage.objectKeyFromReference(reference);
  }

  private toStorageProjectData(data: CreateProjectDto): CreateProjectDto {
    return {
      ...data,
      images: data.images.map((image) =>
        this.storage.isPreservedStaticImage(image)
          ? image
          : this.storage.objectKeyFromReference(image),
      ),
      backgroundImage:
        data.backgroundImage && !this.storage.isPreservedStaticImage(data.backgroundImage)
          ? this.storage.objectKeyFromReference(data.backgroundImage)
          : data.backgroundImage,
    };
  }

  private async verifyImageObjects(data: CreateProjectDto): Promise<void> {
    const keys = new Set([
      ...data.images,
      data.backgroundImage ?? "",
    ].filter((reference) => reference && !this.storage.isPreservedStaticImage(reference)));
    for (const key of keys) {
      if (!(await this.storage.hasObject(key))) {
        throw new BadRequestException(
          "An uploaded image is no longer available in storage; upload it again.",
        );
      }
    }
  }

  private toPublicProject<T extends { images: string[]; backgroundImage: string | null }>(
    project: T,
  ) {
    return {
      ...project,
      images: project.images.map((image) =>
        this.storage.publicImageReference(image),
      ),
      backgroundImage: project.backgroundImage
        ? this.storage.publicImageReference(project.backgroundImage)
        : null,
    };
  }

  private async deleteUnreferencedImages(
    images: string[],
    failureMessage: string,
  ): Promise<void> {
    for (const image of new Set(images)) {
      if (!image || this.storage.isPreservedStaticImage(image)) continue;
      const stillUsed = await this.prisma.project.findFirst({
        where: {
          OR: [{ images: { has: image } }, { backgroundImage: image }],
        },
        select: { id: true },
      });
      if (stillUsed) continue;

      try {
        await this.storage.deleteObject(image);
      } catch (error) {
        throw new InternalServerErrorException(failureMessage, { cause: error });
      }
    }
  }

  private isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
}