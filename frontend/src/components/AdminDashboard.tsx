"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminDashboardHref,
  parseAdminTab,
  type AdminTab,
} from "@/lib/admin-tabs";
import {
  messageDismissDelay,
  useAutoDismissMessage,
} from "@/hooks/useAutoDismissMessage";
import { useAdminToast } from "@/hooks/useAdminToast";
import { AdminToast } from "@/components/AdminToast";
import {
  parseHomepageProjects,
  parseProjects,
  getBrowserApiBaseUrl,
  type Project,
} from "@/lib/projects-api";
import styles from "./AdminDashboard.module.css";

interface Enquiry {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string;
  serviceRequired: string;
  budgetRange: string | null;
  message: string;
  status: "New" | "In Progress" | "Completed";
  createdAt: string;
  project: { id: string; projectName: string; projectLink: string } | null;
}

type EnquiryStatusFilter = "all" | Enquiry["status"];
const enquiryStatusOrder: Record<Enquiry["status"], number> = {
  New: 0,
  "In Progress": 1,
  Completed: 2,
};

interface ProjectForm {
  projectType: string;
  projectName: string;
  description: string;
  projectLink: string;
  image: string;
  imageName: string;
  backgroundImage: string;
  backgroundImageName: string;
}

const adminPageSize = 15;
const enquiryPageSize = 10;
const homepageAvailablePageSize = 12;
const emptyProject: ProjectForm = {
  projectType: "",
  projectName: "",
  description: "",
  projectLink: "",
  image: "",
  imageName: "",
  backgroundImage: "",
  backgroundImageName: "",
};

function getStoredImageName(imageUrl: string) {
  let path = imageUrl.split(/[?#]/, 1)[0] ?? "";
  try {
    const url = new URL(imageUrl, "http://portfolio.local");
    const key = url.pathname === "/media" ? url.searchParams.get("key") : null;
    if (key) path = key;
  } catch {
    path = imageUrl.split(/[?#]/, 1)[0] ?? "";
  }
  const encodedName = path.slice(path.lastIndexOf("/") + 1);
  if (!encodedName) return "Uploaded image";

  try {
    return decodeURIComponent(encodedName);
  } catch {
    return encodedName;
  }
}

async function readError(response: Response): Promise<string> {
  const result: unknown = await response.json();
  if (result && typeof result === "object" && "message" in result) {
    const message = result.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
      return message.join(" ");
    }
  }
  return `Request failed with HTTP ${response.status}.`;
}

type ListPaginationProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  label: string;
  onPageChange: (page: number) => void;
};

function ListPagination({
  currentPage,
  pageSize,
  totalItems,
  label,
  onPageChange,
}: ListPaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav className={styles.pagination} aria-label={`${label} pagination`}>
      <span className={styles.paginationSummary} aria-live="polite">
        Showing <strong>{firstItem}–{lastItem}</strong> of {totalItems}
      </span>
      <div className={styles.paginationControls}>
        <button
          type="button"
          className={styles.paginationButton}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span className={styles.paginationPage}>
          Page <strong>{currentPage}</strong> of {totalPages}
        </span>
        <button
          type="button"
          className={styles.paginationButton}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

async function fetchAdminData(): Promise<{
  projects: Project[];
  enquiries: Enquiry[];
  homepageProjects: (Project | null)[];
} | null> {
  const [projectResponse, enquiryResponse, homepageResponse] = await Promise.all([
    fetch(`${getBrowserApiBaseUrl()}/admin/projects`, {
      credentials: "include",
      cache: "no-store",
    }),
    fetch(`${getBrowserApiBaseUrl()}/admin/enquiries`, {
      credentials: "include",
      cache: "no-store",
    }),
    fetch(`${getBrowserApiBaseUrl()}/admin/projects/homepage`, {
      credentials: "include",
      cache: "no-store",
    }),
  ]);
  if (
    projectResponse.status === 401 ||
    enquiryResponse.status === 401 ||
    homepageResponse.status === 401
  ) {
    return null;
  }
  if (!projectResponse.ok) throw new Error(await readError(projectResponse));
  if (!enquiryResponse.ok) throw new Error(await readError(enquiryResponse));
  if (!homepageResponse.ok) throw new Error(await readError(homepageResponse));

  const homepageProjects = parseHomepageProjects(await homepageResponse.json());

  return {
    projects: parseProjects(await projectResponse.json()),
    enquiries: (await enquiryResponse.json()) as Enquiry[],
    homepageProjects,
  };
}

export function AdminDashboard({ initialTab }: { initialTab: AdminTab }) {
  const router = useRouter();
  const projectDialogRef = useRef<HTMLDialogElement>(null);
  const imagePreviewDialogRef = useRef<HTMLDialogElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [projectsPage, setProjectsPage] = useState(1);
  const [enquiriesPage, setEnquiriesPage] = useState(1);
  const [homepageProjectsPage, setHomepageProjectsPage] = useState(1);
  const [projectSearch, setProjectSearch] = useState("");
  const [enquirySearch, setEnquirySearch] = useState("");
  const [enquiryStatusFilter, setEnquiryStatusFilter] =
    useState<EnquiryStatusFilter>("all");
  const [homepageProjectIds, setHomepageProjectIds] = useState<string[]>([]);
  const [homepageTargetPosition, setHomepageTargetPosition] = useState<
    number | null
  >(null);
  const [homepageSaving, setHomepageSaving] = useState(false);
  const [homepageView, setHomepageView] = useState<"featured" | "available">(
    "featured",
  );
  const [draggedHomepageProjectId, setDraggedHomepageProjectId] = useState("");
  const [homepageDropPosition, setHomepageDropPosition] = useState<number | null>(
    null,
  );
  const [homepageProjectSearch, setHomepageProjectSearch] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<ProjectForm>(emptyProject);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewImageSize, setPreviewImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const selectedEnquiryId = selectedEnquiry?.id ?? null;
  const [deletingEnquiry, setDeletingEnquiry] = useState(false);
  const mobileMenuRootRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const enquiryDetailRef = useRef<HTMLElement | null>(null);
  const {
    toasts,
    showSuccess,
    showError,
    dismissToast,
    clearAllToasts,
  } = useAdminToast();
  const [projectFormError, setProjectFormError] = useAutoDismissMessage();
  const [savingProject, setSavingProject] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBackgroundImage, setUploadingBackgroundImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [backgroundImageUploadError, setBackgroundImageUploadError] = useState("");
  const [loading, setLoading] = useState(true);
  const isUploadingImage = uploadingImage || uploadingBackgroundImage;

  useEffect(() => {
    const syncActiveTab = () =>
      setActiveTab(
        parseAdminTab(new URLSearchParams(window.location.search).get("tab")),
      );
    syncActiveTab();
    window.addEventListener("popstate", syncActiveTab);
    return () => window.removeEventListener("popstate", syncActiveTab);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const dismissOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mobileMenuRootRef.current?.contains(target)) return;
      setMobileMenuOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileMenuOpen(false);
      mobileMenuButtonRef.current?.focus();
    };
    const mobileViewport = window.matchMedia("(max-width: 800px)");
    const dismissOnDesktopResize = () => {
      if (!mobileViewport.matches) setMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("pointerdown", dismissOnOutsidePointer);
    document.addEventListener("keydown", dismissOnEscape);
    mobileViewport.addEventListener("change", dismissOnDesktopResize);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("pointerdown", dismissOnOutsidePointer);
      document.removeEventListener("keydown", dismissOnEscape);
      mobileViewport.removeEventListener("change", dismissOnDesktopResize);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!selectedEnquiry) return;

    const dismissOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (enquiryDetailRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-enquiry-item]") !== null
      ) {
        return;
      }
      setSelectedEnquiry(null);
    };

    document.addEventListener("pointerdown", dismissOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", dismissOnOutsidePointer);
  }, [selectedEnquiry]);

  useEffect(() => {
    if (!selectedEnquiryId) return;

    const mobileViewport = window.matchMedia("(max-width: 800px)");
    let previousBodyOverflow: string | null = null;
    const updateScrollLock = (isMobile: boolean) => {
      if (isMobile && previousBodyOverflow === null) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      } else if (!isMobile && previousBodyOverflow !== null) {
        document.body.style.overflow = previousBodyOverflow;
        previousBodyOverflow = null;
      }
    };

    const dismissOnEscape = (event: KeyboardEvent) => {
      if (mobileViewport.matches && event.key === "Escape") {
        setSelectedEnquiry(null);
      }
    };
    const dismissOnDesktopResize = (event: MediaQueryListEvent) => {
      updateScrollLock(event.matches);
      if (!event.matches) {
        setSelectedEnquiry(null);
      }
    };

    updateScrollLock(mobileViewport.matches);
    document.addEventListener("keydown", dismissOnEscape);
    mobileViewport.addEventListener("change", dismissOnDesktopResize);
    return () => {
      if (previousBodyOverflow !== null) {
        document.body.style.overflow = previousBodyOverflow;
      }
      document.removeEventListener("keydown", dismissOnEscape);
      mobileViewport.removeEventListener("change", dismissOnDesktopResize);
    };
  }, [selectedEnquiryId]);

  function navigateToTab(tab: AdminTab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === tab) return;
    url.searchParams.set("tab", tab);
    window.history.pushState(null, "", url);
  }

  function selectTabFromMenu(tab: AdminTab) {
    navigateToTab(tab);
    setMobileMenuOpen(false);
    if (mobileMenuOpen) mobileMenuButtonRef.current?.focus();
  }

  useEffect(() => {
    if (!imageUploadError) return;
    const timeout = window.setTimeout(
      () => setImageUploadError(""),
      messageDismissDelay,
    );
    return () => window.clearTimeout(timeout);
  }, [imageUploadError]);

  useEffect(() => {
    if (!backgroundImageUploadError) return;
    const timeout = window.setTimeout(
      () => setBackgroundImageUploadError(""),
      messageDismissDelay,
    );
    return () => window.clearTimeout(timeout);
  }, [backgroundImageUploadError]);

  const enquirySearchTerm = enquirySearch.trim().toLowerCase();
  const filteredEnquiries = enquiries
    .filter((enquiry) => {
      const matchesStatus =
        enquiryStatusFilter === "all" || enquiry.status === enquiryStatusFilter;
      const matchesSearch =
        !enquirySearchTerm ||
        [
          enquiry.name,
          enquiry.email,
          enquiry.phone,
          enquiry.companyName ?? "",
          enquiry.serviceRequired,
          enquiry.budgetRange ?? "",
          enquiry.message,
          enquiry.project?.projectName ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(enquirySearchTerm);

      return matchesStatus && matchesSearch;
    })
    .sort((first, second) => {
      const statusDifference =
        enquiryStatusOrder[first.status] - enquiryStatusOrder[second.status];
      if (statusDifference !== 0) return statusDifference;
      return (
        Date.parse(second.createdAt) - Date.parse(first.createdAt) || 0
      );
    });
  const projectSearchTerm = projectSearch.trim().toLowerCase();
  const filteredProjects = projects.filter((project) =>
    [
      project.projectName,
      project.projectType,
      project.description,
      project.projectLink,
    ]
      .join(" ")
      .toLowerCase()
      .includes(projectSearchTerm),
  );
  const projectsPageCount = Math.max(
    1,
    Math.ceil(filteredProjects.length / adminPageSize),
  );
  const enquiriesPageCount = Math.max(
    1,
    Math.ceil(filteredEnquiries.length / enquiryPageSize),
  );
  const currentProjectsPage = Math.min(projectsPage, projectsPageCount);
  const currentEnquiriesPage = Math.min(enquiriesPage, enquiriesPageCount);
  const visibleProjects = filteredProjects.slice(
    (currentProjectsPage - 1) * adminPageSize,
    currentProjectsPage * adminPageSize,
  );
  const visibleEnquiries = filteredEnquiries.slice(
    (currentEnquiriesPage - 1) * enquiryPageSize,
    currentEnquiriesPage * enquiryPageSize,
  );
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const homepageSelectionCount = homepageProjectIds.filter(Boolean).length;
  const selectedHomepageProjectIds = new Set(homepageProjectIds);
  const availableHomepageProjects = projects.filter(
    (project) => !selectedHomepageProjectIds.has(project.id),
  );
  const searchTerm = homepageProjectSearch.trim().toLowerCase();
  const filteredAvailableHomepageProjects = availableHomepageProjects.filter(
    (project) =>
      [project.projectName, project.projectType, project.description]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm),
  );
  const homepageProjectsPageCount = Math.max(
    1,
    Math.ceil(filteredAvailableHomepageProjects.length / homepageAvailablePageSize),
  );
  const currentHomepageProjectsPage = Math.min(
    homepageProjectsPage,
    homepageProjectsPageCount,
  );
  const visibleAvailableHomepageProjects = filteredAvailableHomepageProjects.slice(
    (currentHomepageProjectsPage - 1) * homepageAvailablePageSize,
    currentHomepageProjectsPage * homepageAvailablePageSize,
  );

  if (projectsPage > projectsPageCount) {
    setProjectsPage(projectsPageCount);
  }
  if (enquiriesPage > enquiriesPageCount) {
    setEnquiriesPage(enquiriesPageCount);
  }
  if (homepageProjectsPage > homepageProjectsPageCount) {
    setHomepageProjectsPage(homepageProjectsPageCount);
  }

  useEffect(() => {
    const dialog = projectDialogRef.current;
    if (!dialog) return;

    if (showProjectForm && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("input")?.focus();
    } else if (!showProjectForm && dialog.open) {
      dialog.close();
    }
  }, [showProjectForm]);

  useEffect(() => {
    const dialog = imagePreviewDialogRef.current;
    if (!dialog) return;

    if (previewImage && !dialog.open) {
      dialog.showModal();
    } else if (!previewImage && dialog.open) {
      dialog.close();
    }
  }, [previewImage]);

  async function loadData(): Promise<boolean> {
    setLoading(true);
    try {
      const data = await fetchAdminData();
      if (!data) {
        router.replace("/admin/login");
        return false;
      }
      setProjects(data.projects);
      setEnquiries(data.enquiries);
      setHomepageProjectIds(
        data.homepageProjects.map((project) => project?.id ?? ""),
      );
      clearAllToasts();
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to load admin data.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchAdminData()
      .then((data) => {
        if (!active) return;
        if (!data) {
          router.replace("/admin/login");
          return;
        }
        setProjects(data.projects);
        setEnquiries(data.enquiries);
        setHomepageProjectIds(
          data.homepageProjects.map((project) => project?.id ?? ""),
        );
      })
      .catch((error: unknown) => {
        if (active) {
          showError(
            error instanceof Error ? error.message : "Unable to load admin data.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router, showError]);

  async function logout() {
    try {
      const response = await fetch("/api/admin/auth/logout/", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(await readError(response));
      router.replace("/");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  function editProject(project: Project) {
    setEditingId(project.id);
    setProjectFormError("");
    setUploadingImage(false);
    setImageUploadError("");
    setUploadingBackgroundImage(false);
    setBackgroundImageUploadError("");
    clearAllToasts();
    setShowProjectForm(true);
    setForm({
      projectType: project.projectType,
      projectName: project.projectName,
      description: project.description,
      projectLink: project.projectLink,
      image: project.images[0] ?? "",
      imageName: project.images[0] ? getStoredImageName(project.images[0]) : "",
      backgroundImage: project.backgroundImage ?? "",
      backgroundImageName: project.backgroundImage
        ? getStoredImageName(project.backgroundImage)
        : "",
    });
  }

  function removeProjectImage() {
    setForm((current) => ({ ...current, image: "", imageName: "" }));
    setImageUploadError("");
  }

  function removeProjectBackgroundImage() {
    setForm((current) => ({
      ...current,
      backgroundImage: "",
      backgroundImageName: "",
    }));
    setBackgroundImageUploadError("");
  }

  async function uploadProjectImage(
    file: File,
    imageKind: "portrait" | "background" = "portrait",
  ) {
    const isBackgroundImage = imageKind === "background";
    const setUploading = isBackgroundImage
      ? setUploadingBackgroundImage
      : setUploadingImage;
    const setUploadError = isBackgroundImage
      ? setBackgroundImageUploadError
      : setImageUploadError;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      const msg = "Choose a JPEG, PNG, or WebP image.";
      setUploadError(msg);
      showError(msg);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const msg = "Image files must be 5 MB or smaller.";
      setUploadError(msg);
      showError(msg);
      return;
    }

    setUploadError("");
    setUploading(true);

    try {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        throw new Error("Choose a valid JPEG, PNG, or WebP image.");
      }
      const isPortrait = bitmap.height > bitmap.width;
      bitmap.close();
      if (!isBackgroundImage && !isPortrait) {
        throw new Error("Choose a portrait image with a greater height than width.");
      }

      const body = new FormData();
      body.append("file", file);
      const uploadPath = isBackgroundImage
        ? "background-images"
        : "images";
      const response = await fetch(`${getBrowserApiBaseUrl()}/admin/projects/${uploadPath}`, {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok) throw new Error(await readError(response));

      const result: unknown = await response.json();
      if (!result || typeof result !== "object" || !("imageUrl" in result)) {
        throw new Error("The upload service returned an invalid image reference.");
      }
      const imageUrl = result.imageUrl;
      if (typeof imageUrl !== "string") {
        throw new Error("The upload service returned an invalid image reference.");
      }

      setForm((current) => ({
        ...current,
        [isBackgroundImage ? "backgroundImage" : "image"]: imageUrl,
        [isBackgroundImage ? "backgroundImageName" : "imageName"]: file.name,
      }));
      showSuccess(
        isBackgroundImage
          ? "Background image uploaded successfully."
          : "Image uploaded successfully.",
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unable to upload this image.";
      setUploadError(msg);
      showError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAllToasts();
    setProjectFormError("");
    const images = form.image.trim() ? [form.image.trim()] : [];
    setSavingProject(true);
    try {
      const wasEditing = Boolean(editingId);
      const response = await fetch(
        `${getBrowserApiBaseUrl()}/admin/projects${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectType: form.projectType,
            projectName: form.projectName,
            description: form.description,
            projectLink: form.projectLink,
            images,
            backgroundImage: form.backgroundImage.trim() || null,
          }),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      setForm(emptyProject);
      setEditingId("");
      setShowProjectForm(false);
      const refreshed = await loadData();
      if (refreshed && !wasEditing) {
        setProjectsPage(Math.ceil((projects.length + 1) / adminPageSize));
      }
      if (refreshed) {
        showSuccess(
          wasEditing
            ? "Project updated successfully."
            : "Project created successfully.",
        );
      } else {
        showError(
          "Project saved successfully, but the project list could not be refreshed.",
        );
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unable to save project.";
      setProjectFormError(msg);
      showError(msg);
    } finally {
      setSavingProject(false);
    }
  }

  function closeProjectForm() {
    if (savingProject || isUploadingImage) return;
    setEditingId("");
    setForm(emptyProject);
    setProjectFormError("");
    setImageUploadError("");
    setBackgroundImageUploadError("");
    setShowProjectForm(false);
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete "${project.projectName}"?`)) return;
    try {
      const response = await fetch(`${getBrowserApiBaseUrl()}/admin/projects/${project.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error(await readError(response));
      if (await loadData()) showSuccess("Project deleted.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to delete project.");
    }
  }

  async function updateStatus(enquiry: Enquiry, status: Enquiry["status"]) {
    try {
      const response = await fetch(
        `${getBrowserApiBaseUrl()}/admin/enquiries/${enquiry.id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      if (!(await loadData())) return;
      setSelectedEnquiry(
        enquiryStatusFilter === "all" || enquiryStatusFilter === status
          ? { ...enquiry, status }
          : null,
      );
      showSuccess("Enquiry status updated.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to update enquiry.");
    }
  }

  async function deleteEnquiry(enquiry: Enquiry) {
    if (
      !window.confirm(
        `Delete the enquiry from "${enquiry.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingEnquiry(true);
    try {
      const response = await fetch(
        `${getBrowserApiBaseUrl()}/admin/enquiries/${enquiry.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error(await readError(response));

      setSelectedEnquiry(null);
      if (await loadData()) showSuccess("Enquiry deleted.");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to delete enquiry.",
      );
    } finally {
      setDeletingEnquiry(false);
    }
  }

  function addHomepageProject(projectId: string) {
    const targetPosition = homepageTargetPosition;
    setHomepageProjectIds((current) => {
      if (current.includes(projectId)) return current;
      const emptyPosition =
        targetPosition !== null &&
        targetPosition >= 0 &&
        targetPosition < current.length &&
        current[targetPosition] === ""
          ? targetPosition
          : current.indexOf("");
      if (emptyPosition < 0) return current;
      const next = [...current];
      next[emptyPosition] = projectId;
      return next;
    });
    setHomepageTargetPosition(null);
  }

  function removeHomepageProject(projectId: string) {
    setHomepageProjectIds((current) => {
      const position = current.indexOf(projectId);
      if (position < 0) return current;
      const next = [...current];
      next[position] = "";
      return next;
    });
  }

  function moveHomepageProject(projectId: string, targetPosition: number) {
    if (homepageSaving) return;
    setHomepageProjectIds((current) => {
      const sourcePosition = current.indexOf(projectId);
      if (
        sourcePosition < 0 ||
        targetPosition < 0 ||
        targetPosition >= current.length ||
        sourcePosition === targetPosition
      ) {
        return current;
      }

      const next = [...current];
      [next[sourcePosition], next[targetPosition]] = [
        next[targetPosition],
        next[sourcePosition],
      ];
      return next;
    });
  }

  function finishHomepageProjectDrag() {
    setDraggedHomepageProjectId("");
    setHomepageDropPosition(null);
  }

  async function saveHomepageSelection() {
    setHomepageSaving(true);
    clearAllToasts();
    try {
      const response = await fetch(`${getBrowserApiBaseUrl()}/admin/projects/homepage`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectIds: homepageProjectIds.map((projectId) => projectId || ""),
        }),
      });
      if (!response.ok) throw new Error(await readError(response));

      const savedProjects = parseHomepageProjects(await response.json());
      if (savedProjects.length !== 8) {
        throw new Error("Admin API did not save eight homepage slots.");
      }
      setHomepageProjectIds(
        savedProjects.map((project) => project?.id ?? ""),
      );
      showSuccess("Homepage projects saved successfully.");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to save homepage projects.",
      );
    } finally {
      setHomepageSaving(false);
    }
  }

  return (
    <main className={styles.app}>
      {!showProjectForm && <AdminToast toasts={toasts} onDismiss={dismissToast} />}
      <aside className={styles.sidebar}>
        <div
          className={`${styles.mobileMenuRoot} ${mobileMenuOpen ? styles.mobileMenuRootOpen : ""}`}
          ref={mobileMenuRootRef}
        >
          <div className={styles.sidebarHeader}>
            <Link
              className={styles.brand}
              href={adminDashboardHref}
              aria-label="Durozen admin homepage"
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }
                event.preventDefault();
                selectTabFromMenu("homepage");
              }}
            >
              <span className={styles.brandMark} aria-hidden="true">D</span>
              <span>
                <strong>Durozen</strong>
                <small>PORTFOLIO STUDIO</small>
              </span>
            </Link>
            <button
              ref={mobileMenuButtonRef}
              type="button"
              className={styles.mobileMenuButton}
              aria-label={mobileMenuOpen ? "Close admin menu" : "Open admin menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-mobile-menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <svg
                className={styles.mobileMenuIcon}
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M3 5h14M3 10h14M3 15h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>

          <button
            type="button"
            className={styles.mobileMenuBackdrop}
            aria-label="Close admin menu"
            tabIndex={-1}
            onClick={() => {
              setMobileMenuOpen(false);
              mobileMenuButtonRef.current?.focus();
            }}
          />

          <div
            id="admin-mobile-menu"
            className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ""}`}
          >
            <div className={styles.sidebarLabel}>WORKSPACE</div>
            <nav className={styles.navigation} aria-label="Admin sections">
              <button
                type="button"
                className={activeTab === "homepage" ? styles.navActive : styles.navButton}
                aria-pressed={activeTab === "homepage"}
                onClick={() => selectTabFromMenu("homepage")}
              >
                <span className={styles.navIcon} aria-hidden="true">⌂</span>
                Homepage <span className={styles.navCount}>{homepageSelectionCount}/8</span>
              </button>
              <button
                type="button"
                className={activeTab === "projects" ? styles.navActive : styles.navButton}
                aria-pressed={activeTab === "projects"}
                onClick={() => selectTabFromMenu("projects")}
              >
                <span className={styles.navIcon} aria-hidden="true">▦</span>
                Projects <span className={styles.navCount}>{projects.length}</span>
              </button>
              <button
                type="button"
                className={activeTab === "enquiries" ? styles.navActive : styles.navButton}
                aria-pressed={activeTab === "enquiries"}
                onClick={() => selectTabFromMenu("enquiries")}
              >
                <span className={styles.navIcon} aria-hidden="true">✉</span>
                Enquiries <span className={styles.navCount}>{enquiries.length}</span>
              </button>
            </nav>

            <button
              type="button"
              className={styles.sidebarSignOut}
              onClick={() => {
                setMobileMenuOpen(false);
                void logout();
              }}
            >
              <span aria-hidden="true">↪</span> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <div className={styles.breadcrumb}>Workspace <span>/</span> Admin</div>
            <h1 className={styles.pageTitle}>
              {activeTab === "projects"
                ? "Projects"
                : activeTab === "enquiries"
                  ? "Enquiries"
                  : "Homepage"}
            </h1>
          </div>
          <div className={styles.topbarActions}>
            <Link className={styles.portfolioButton} href="/">
              <svg
                className={styles.portfolioArrow}
                viewBox="0 0 16 16"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M14 8H3m0 0 5-5m-5 5 5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
              </svg>
              <span>Back to portfolio</span>
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          {loading && <div className={styles.loading}>Loading workspace…</div>}

          {!loading && activeTab === "projects" && (
            <section className={styles.panel}>
              <div className={`${styles.panelHeader} ${styles.projectPanelHeader}`}>
                <div className={styles.projectPanelTitle}>
                  <h2>All projects</h2>
                  <span className={styles.inboxCount}>{projects.length} projects</span>
                </div>
                <label className={styles.projectSearch}>
                  <span className={styles.srOnly}>Search all projects</span>
                  <input
                    type="search"
                    value={projectSearch}
                    onChange={(event) => {
                      setProjectSearch(event.target.value);
                      setProjectsPage(1);
                    }}
                    placeholder="Search projects…"
                  />
                </label>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setEditingId("");
                    setForm(emptyProject);
                    setProjectFormError("");
                    setUploadingImage(false);
                    setImageUploadError("");
                    setUploadingBackgroundImage(false);
                    setBackgroundImageUploadError("");
                    clearAllToasts();
                    setShowProjectForm(true);
                  }}
                >
                  <span aria-hidden="true">+</span> Add project
                </button>
              </div>

              <dialog
                ref={projectDialogRef}
                className={styles.projectDialog}
                aria-labelledby="project-dialog-title"
                onCancel={(event) => {
                  if (event.target !== event.currentTarget) return;
                  event.preventDefault();
                  closeProjectForm();
                }}
                onClick={(event) => {
                  if (event.target === event.currentTarget) closeProjectForm();
                }}
              >
                {showProjectForm && <AdminToast toasts={toasts} onDismiss={dismissToast} />}
                <form
                  onSubmit={saveProject}
                  className={styles.projectForm}
                  aria-busy={savingProject}
                >
                  <div className={styles.formHeading}>
                    <div>
                      <span className={styles.eyebrow}>{editingId ? "UPDATE CONTENT" : "NEW CONTENT"}</span>
                      <h3 id="project-dialog-title">{editingId ? "Edit project" : "Add a project"}</h3>
                    </div>
                    <button
                      type="button"
                      className={styles.closeButton}
                      aria-label="Close project form"
                      disabled={savingProject || isUploadingImage}
                      onClick={closeProjectForm}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>
                        Project name <span className={styles.required} aria-hidden="true">*</span>
                      </span>
                      <input
                        required
                        maxLength={160}
                        value={form.projectName}
                        onChange={(event) => setForm({ ...form, projectName: event.target.value })}
                        placeholder="e.g. Brand identity refresh"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>
                        Project type <span className={styles.required} aria-hidden="true">*</span>
                      </span>
                      <input
                        required
                        maxLength={120}
                        value={form.projectType}
                        onChange={(event) => setForm({ ...form, projectType: event.target.value })}
                        placeholder="e.g. Digital product"
                      />
                    </label>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span>
                        Description <span className={styles.required} aria-hidden="true">*</span>
                      </span>
                      <textarea
                        required
                        maxLength={12000}
                        rows={5}
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        placeholder="Describe the project…"
                      />
                    </label>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span>
                        Project link <span className={styles.required} aria-hidden="true">*</span>
                      </span>
                      <input
                        required
                        type="url"
                        maxLength={2048}
                        value={form.projectLink}
                        onChange={(event) => setForm({ ...form, projectLink: event.target.value })}
                        placeholder="https://"
                      />
                    </label>
                  </div>
                  <div className={styles.imageUploadGrid}>
                    <div className={styles.imageUploadField}>
                      <label className={styles.field}>
                        <span>Portrait image</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={savingProject || isUploadingImage}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            if (file) void uploadProjectImage(file);
                          }}
                        />
                      </label>
                      {form.image && (
                        <>
                          <span className={styles.imageFileName} title={form.imageName}>
                            {form.imageName}
                          </span>
                          <div className={styles.imageUploadActions}>
                            <button
                              type="button"
                              className={`${styles.secondaryButton} ${styles.imageViewButton}`}
                              aria-label="View portrait image"
                              aria-haspopup="dialog"
                              onClick={() => {
                                setPreviewImageSize(null);
                                setPreviewImage(form.image);
                              }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className={styles.removeImageButton}
                              disabled={savingProject || isUploadingImage}
                              onClick={removeProjectImage}
                            >
                              Remove image
                            </button>
                          </div>
                        </>
                      )}
                      {uploadingImage && (
                        <span className={styles.imageUploadStatus} role="status">
                          Uploading image…
                        </span>
                      )}
                      {imageUploadError && (
                        <span className={styles.imageUploadError} role="alert">
                          {imageUploadError}
                        </span>
                      )}
                    </div>
                    <div className={styles.imageUploadField}>
                      <label className={styles.field}>
                        <span>Section background</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={savingProject || isUploadingImage}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            if (file) void uploadProjectImage(file, "background");
                          }}
                        />
                      </label>
                      {form.backgroundImage && (
                        <>
                          <span
                            className={styles.imageFileName}
                            title={form.backgroundImageName}
                          >
                            {form.backgroundImageName}
                          </span>
                          <div className={styles.imageUploadActions}>
                            <button
                              type="button"
                              className={`${styles.secondaryButton} ${styles.imageViewButton}`}
                              aria-label="View section background image"
                              aria-haspopup="dialog"
                              onClick={() => {
                                setPreviewImageSize(null);
                                setPreviewImage(form.backgroundImage);
                              }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className={styles.removeImageButton}
                              disabled={savingProject || isUploadingImage}
                              onClick={removeProjectBackgroundImage}
                            >
                              Remove image
                            </button>
                          </div>
                        </>
                      )}
                      {uploadingBackgroundImage && (
                        <span className={styles.imageUploadStatus} role="status">
                          Uploading image…
                        </span>
                      )}
                      {backgroundImageUploadError && (
                        <span className={styles.imageUploadError} role="alert">
                          {backgroundImageUploadError}
                        </span>
                      )}
                    </div>
                  </div>
                  {projectFormError && (
                    <p className={styles.formError} role="alert">
                      {projectFormError}
                    </p>
                  )}
                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={savingProject || isUploadingImage}
                    >
                      {isUploadingImage
                        ? "Uploading image…"
                        : savingProject
                        ? "Saving…"
                        : editingId
                          ? "Save changes"
                          : "Create project"}
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={savingProject || isUploadingImage}
                      onClick={closeProjectForm}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </dialog>

              <dialog
                ref={imagePreviewDialogRef}
                className={styles.imagePreviewDialog}
                aria-label="Project image preview"
                onCancel={(event) => {
                  if (event.target === event.currentTarget) setPreviewImage("");
                }}
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    setPreviewImage("");
                  }
                }}
              >
                <button
                  type="button"
                  className={styles.imagePreviewClose}
                  aria-label="Close image preview"
                  onClick={() => setPreviewImage("")}
                >
                  ×
                </button>
                {previewImage && (
                  <div className={styles.imagePreviewStage}>
                    <Image
                      src={previewImage}
                      alt="Full-size project image preview"
                      width={previewImageSize?.width ?? 1}
                      height={previewImageSize?.height ?? 1}
                      onLoad={(event) =>
                        setPreviewImageSize({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight,
                        })
                      }
                      unoptimized
                    />
                  </div>
                )}
              </dialog>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Project</th><th>Type</th><th><span className={styles.srOnly}>Actions</span></th></tr>
                  </thead>
                  <tbody>
                    {visibleProjects.map((project) => (
                      <tr key={project.id}>
                        <td>
                          <strong className={styles.projectName}>{project.projectName}</strong>
                          <span className={styles.projectDescription}>{project.description}</span>
                        </td>
                        <td><span className={styles.typePill}>{project.projectType}</span></td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.actionButton} onClick={() => editProject(project)}>Edit</button>
                            <button type="button" className={styles.deleteButton} onClick={() => void deleteProject(project)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 && (
                      <tr><td colSpan={3} className={styles.emptyState}>No projects yet. Add your first project to get started.</td></tr>
                    )}
                    {projects.length > 0 && filteredProjects.length === 0 && (
                      <tr><td colSpan={3} className={styles.emptyState}>No projects match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <ListPagination
                currentPage={currentProjectsPage}
                pageSize={adminPageSize}
                totalItems={filteredProjects.length}
                label="Projects"
                onPageChange={setProjectsPage}
              />
            </section>
          )}

          {!loading && activeTab === "enquiries" && (
            <section className={`${styles.panel} ${styles.enquiryPanel}`}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.eyebrow}>INCOMING MESSAGES</span>
                  <h2>Enquiry inbox</h2>
                </div>
                <div className={styles.enquiryToolbar}>
                  <label className={styles.enquirySearch}>
                    <span className={styles.srOnly}>Search enquiries</span>
                    <input
                      type="search"
                      value={enquirySearch}
                      onChange={(event) => {
                        setEnquirySearch(event.target.value);
                        setEnquiriesPage(1);
                        setSelectedEnquiry(null);
                      }}
                      placeholder="Search enquiries"
                    />
                  </label>
                  <label className={styles.enquiryStatusFilter}>
                    <span className={styles.srOnly}>Filter enquiries by status</span>
                    <select
                      className={styles.enquiryStatusSelect}
                      value={enquiryStatusFilter}
                      onChange={(event) => {
                        setEnquiryStatusFilter(
                          event.target.value as EnquiryStatusFilter,
                        );
                        setEnquiriesPage(1);
                        setSelectedEnquiry(null);
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="Completed">Completed</option>
                      <option value="In Progress">In Progress</option>
                      <option value="New">New</option>
                    </select>
                  </label>
                </div>
              </div>

              {selectedEnquiry && (
                <button
                  type="button"
                  className={styles.enquiryDetailBackdrop}
                  aria-label="Close enquiry details"
                  onClick={() => setSelectedEnquiry(null)}
                />
              )}

              <div className={styles.enquiryLayout}>
                <div className={styles.enquiryList}>
                  {visibleEnquiries.map((enquiry) => (
                    <div
                      key={enquiry.id}
                      data-enquiry-item
                      className={`${styles.enquiryItem} ${styles[`enquiryItem${enquiry.status.replace(/\s/g, "")}`]} ${selectedEnquiry?.id === enquiry.id ? styles.enquirySelected : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedEnquiry(enquiry)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedEnquiry(enquiry);
                        }
                      }}
                    >
                      <span className={styles.enquiryAvatar}>{enquiry.name.slice(0, 1).toUpperCase()}</span>
                      <span className={styles.enquirySummary}>
                        <strong>{enquiry.name}</strong>
                      </span>
                      <span className={styles.enquiryMeta}>
                        <span className={`${styles.statusPill} ${styles[`status${enquiry.status.replace(/\s/g, "")}`]}`}>
                          {enquiry.status}
                        </span>
                        <time dateTime={enquiry.createdAt}>
                          {new Date(enquiry.createdAt).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </time>
                      </span>
                      <span className={styles.enquiryContact}>
                        {enquiry.email ? (
                          <a
                            href={`mailto:${enquiry.email}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {enquiry.email}
                          </a>
                        ) : (
                          <span className={styles.enquiryContactEmpty}>No email provided</span>
                        )}
                        {enquiry.phone ? (
                          <a
                            href={`tel:${enquiry.phone}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {enquiry.phone}
                          </a>
                        ) : (
                          <span className={styles.enquiryContactEmpty}>No phone provided</span>
                        )}
                      </span>
                    </div>
                  ))}
                  {filteredEnquiries.length === 0 && (
                    <div className={styles.emptyState}>
                      {enquiries.length === 0
                        ? "No enquiries have arrived yet."
                        : "No enquiries match your search and status filter."}
                    </div>
                  )}
                </div>

                {selectedEnquiry ? (
                  <article
                    ref={enquiryDetailRef}
                    className={styles.enquiryDetail}
                  >
                    <div className={styles.detailTop}>
                      <span className={styles.eyebrow}>ENQUIRY DETAILS</span>
                      <div className={styles.detailTopActions}>
                        <button
                          type="button"
                          className={`${styles.deleteButton} ${styles.enquiryDeleteButton}`}
                          disabled={deletingEnquiry}
                          onClick={() => void deleteEnquiry(selectedEnquiry)}
                        >
                          {deletingEnquiry ? "Deleting…" : "Delete"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.closeButton} ${styles.enquiryCloseButton}`}
                          aria-label="Close enquiry details"
                          title="Close details"
                          disabled={deletingEnquiry}
                          onClick={() => setSelectedEnquiry(null)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <label className={`${styles.field} ${styles.statusFieldTop}`}>
                      Update status
                      <select
                        className={styles.statusSelect}
                        value={selectedEnquiry.status}
                        disabled={deletingEnquiry}
                        onChange={(event) =>
                          void updateStatus(
                            selectedEnquiry,
                            event.target.value as Enquiry["status"],
                          )
                        }
                      >
                        <option>New</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    </label>
                    <div className={styles.detailContent}>
                      <div className={styles.detailMeta}>
                        <div className={styles.projectReference}>
                          <span>RELATED PROJECT</span>
                          {selectedEnquiry.project ? (
                            <a
                              className={styles.projectReferenceLink}
                              href={
                                selectedEnquiry.project.projectLink ||
                                `/projects?q=${encodeURIComponent(selectedEnquiry.project.projectName)}`
                              }
                              target={selectedEnquiry.project.projectLink ? "_blank" : undefined}
                              rel={selectedEnquiry.project.projectLink ? "noopener noreferrer" : undefined}
                            >
                              {selectedEnquiry.project.projectName}
                              {selectedEnquiry.project.projectLink && (
                                <span aria-hidden="true"> ↗</span>
                              )}
                            </a>
                          ) : (
                            <strong>Not specified</strong>
                          )}
                        </div>
                        <div className={styles.detailDate}>
                          <span>RECEIVED</span>
                          <time dateTime={selectedEnquiry.createdAt}>
                            {new Date(selectedEnquiry.createdAt).toLocaleString(undefined, {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </time>
                        </div>
                      </div>
                      <dl className={styles.enquiryMetadata}>
                        <div>
                          <dt>COMPANY</dt>
                          <dd>{selectedEnquiry.companyName || "Not provided"}</dd>
                        </div>
                        <div>
                          <dt>SERVICE REQUIRED</dt>
                          <dd>{selectedEnquiry.serviceRequired || "Not specified"}</dd>
                        </div>
                        <div>
                          <dt>PROJECT BUDGET</dt>
                          <dd>{selectedEnquiry.budgetRange || "Not specified"}</dd>
                        </div>
                      </dl>
                      <div className={styles.descriptionBlock}>
                        <span className={styles.descriptionLabel}>DESCRIPTION</span>
                        <div className={styles.messageText}>
                          {selectedEnquiry.message || "No description provided."}
                        </div>
                      </div>
                    </div>
                  </article>
                ) : (
                  enquiries.length > 0 && (
                    <div className={styles.detailPlaceholder}>
                      <span aria-hidden="true">✉</span>
                      <strong>
                        {filteredEnquiries.length > 0
                          ? "Select an enquiry"
                          : "No matching enquiries"}
                      </strong>
                      <p>
                        {filteredEnquiries.length > 0
                          ? "Choose a message from the inbox to view its details."
                          : "Try adjusting your search or status filter."}
                      </p>
                    </div>
                  )
                )}
              </div>
              <ListPagination
                currentPage={currentEnquiriesPage}
                pageSize={enquiryPageSize}
                totalItems={filteredEnquiries.length}
                label="Enquiries"
                onPageChange={setEnquiriesPage}
              />
            </section>
          )}

          {!loading && activeTab === "homepage" && (
            <section className={styles.panel}>
              <div className={`${styles.panelHeader} ${styles.homepagePanelHeader}`}>
                <div>
                  <span className={styles.eyebrow}>HOME PAGE CONTENT</span>
                  <h2>Choose featured projects</h2>
                </div>
                <div className={styles.homepageActions}>
                  <span className={styles.selectionCount}>
                    {homepageSelectionCount} <span>/ 8 selected</span>
                  </span>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={homepageSaving}
                    onClick={() => void saveHomepageSelection()}
                  >
                    {homepageSaving ? "Saving…" : "Save homepage"}
                  </button>
                </div>
              </div>
              <div className={styles.homepageViewTabs}>
                <button
                  type="button"
                  className={
                    homepageView === "featured"
                      ? styles.homepageViewActive
                      : styles.homepageViewTab
                  }
                  aria-pressed={homepageView === "featured"}
                  onClick={() => {
                    setHomepageTargetPosition(null);
                    setHomepageView("featured");
                  }}
                >
                  Featured projects
                  <span>{homepageSelectionCount}</span>
                </button>
                <button
                  type="button"
                  className={
                    homepageView === "available"
                      ? styles.homepageViewActive
                      : styles.homepageViewTab
                  }
                  aria-pressed={homepageView === "available"}
                  onClick={() => {
                    setHomepageTargetPosition(null);
                    setHomepageView("available");
                  }}
                >
                  All projects
                  <span>{availableHomepageProjects.length}</span>
                </button>
                {homepageView === "available" && (
                  <label className={styles.candidateSearch}>
                    <span className={styles.srOnly}>Search all projects</span>
                    <input
                      type="search"
                      value={homepageProjectSearch}
                      onChange={(event) => {
                        setHomepageProjectSearch(event.target.value);
                        setHomepageProjectsPage(1);
                      }}
                      placeholder="Search projects"
                    />
                  </label>
                )}
              </div>
              {homepageTargetPosition !== null && homepageView === "available" && (
                <p className={styles.homepageListNote}>
                  Choose a project for homepage slot{" "}
                  {String(homepageTargetPosition + 1).padStart(2, "0")}.
                </p>
              )}
              {homepageView === "featured" ? (
                <>
                  <div className={styles.featuredGrid}>
                    {homepageProjectIds.map((projectId, position) => {
                      const project = projectsById.get(projectId);
                      if (!project) {
                        return (
                          <article
                            key={`empty-${position}`}
                            className={`${styles.featureCard} ${styles.featureEmptyCard} ${homepageDropPosition === position ? styles.featureDropTarget : ""}`}
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "move";
                              setHomepageDropPosition(position);
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              const projectId =
                                event.dataTransfer.getData("text/plain") ||
                                draggedHomepageProjectId;
                              if (projectId) {
                                moveHomepageProject(projectId, position);
                              }
                              finishHomepageProjectDrag();
                            }}
                          >
                            <div
                              className={`${styles.featurePreview} ${styles.featureEmptyPreview}`}
                              aria-hidden="true"
                            >
                              Empty slot
                            </div>
                            <div className={styles.featureCardFooter}>
                              <div className={styles.featureCardDetails}>
                                <span className={styles.featureOrder}>
                                  {String(position + 1).padStart(2, "0")}
                                </span>
                                <div className={styles.featureInfo}>
                                  <strong>Choose a project</strong>
                                  <span>This homepage spot is empty</span>
                                </div>
                              </div>
                              <div className={styles.featureCardActions}>
                                <button
                                  type="button"
                                  className={styles.addFeaturedButton}
                                  disabled={homepageSaving}
                                  onClick={() => {
                                    setHomepageTargetPosition(position);
                                    setHomepageView("available");
                                  }}
                                >
                                  Choose project
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      }

                      const previewImage =
                        project.backgroundImage ?? project.images[0];

                      return (
                        <article
                          key={project.id}
                          className={`${styles.featureCard} ${styles.featureSelected} ${draggedHomepageProjectId === project.id ? styles.featureDragging : ""} ${homepageDropPosition === position ? styles.featureDropTarget : ""}`}
                          draggable={!homepageSaving}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", project.id);
                            const card = event.currentTarget;
                            const cardRect = card.getBoundingClientRect();
                            const offsetX = Math.max(
                              0,
                              Math.min(event.clientX - cardRect.left, card.offsetWidth),
                            );
                            const offsetY = Math.max(
                              0,
                              Math.min(event.clientY - cardRect.top, card.offsetHeight),
                            );
                            event.dataTransfer.setDragImage(card, offsetX, offsetY);
                            setDraggedHomepageProjectId(project.id);
                          }}
                          onDragEnd={finishHomepageProjectDrag}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setHomepageDropPosition(position);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const draggedProjectId =
                              event.dataTransfer.getData("text/plain") ||
                              draggedHomepageProjectId;
                            if (draggedProjectId) {
                              moveHomepageProject(draggedProjectId, position);
                            }
                            finishHomepageProjectDrag();
                          }}
                        >
                          <div className={styles.featurePreview}>
                            {previewImage ? (
                              <Image
                                src={previewImage}
                                alt={`${project.projectName} preview`}
                                width={320}
                                height={180}
                                unoptimized
                              />
                            ) : (
                              <span>No image</span>
                            )}
                          </div>
                          <div className={styles.featureCardFooter}>
                            <div className={styles.featureCardDetails}>
                              <span className={styles.featureOrder}>
                                {String(position + 1).padStart(2, "0")}
                              </span>
                              <div className={styles.featureInfo}>
                                <strong>{project.projectName}</strong>
                                <span>{project.projectType}</span>
                              </div>
                            </div>
                            <div className={styles.featureCardActions}>
                              <button
                                type="button"
                                className={styles.removeFeaturedButton}
                                disabled={homepageSaving}
                                onClick={() =>
                                  removeHomepageProject(project.id)
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {filteredAvailableHomepageProjects.length ? (
                    <>
                      <div className={styles.featuredGrid}>
                        {visibleAvailableHomepageProjects.map((project) => {
                          const previewImage =
                            project.backgroundImage ?? project.images[0];

                          return (
                            <article
                              className={`${styles.featureCard} ${styles.featureAvailableCard}`}
                              key={project.id}
                            >
                              <div className={styles.featurePreview}>
                                {previewImage ? (
                                  <Image
                                    src={previewImage}
                                    alt={`${project.projectName} preview`}
                                    width={320}
                                    height={180}
                                    unoptimized
                                  />
                                ) : (
                                  <span>No image</span>
                                )}
                              </div>
                              <div className={styles.featureCardFooter}>
                                <div className={styles.featureCardDetails}>
                                  <div className={styles.featureInfo}>
                                    <strong>{project.projectName}</strong>
                                    <span>{project.projectType}</span>
                                  </div>
                                </div>
                                <div className={styles.featureCardActions}>
                                  <button
                                    type="button"
                                    className={styles.addFeaturedButton}
                                    disabled={
                                      homepageSaving || homepageSelectionCount >= 8
                                    }
                                    onClick={() =>
                                      addHomepageProject(project.id)
                                    }
                                  >
                                    Add to homepage
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                      <ListPagination
                        currentPage={currentHomepageProjectsPage}
                        pageSize={homepageAvailablePageSize}
                        totalItems={filteredAvailableHomepageProjects.length}
                        label="Available projects"
                        onPageChange={setHomepageProjectsPage}
                      />
                    </>
                  ) : (
                    <p className={styles.featureEmptyState}>
                      {availableHomepageProjects.length
                        ? "No projects match your search."
                        : "All projects are already featured on the homepage."}
                    </p>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
