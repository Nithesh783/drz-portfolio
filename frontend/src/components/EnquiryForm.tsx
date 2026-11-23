"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAutoDismissMessage } from "@/hooks/useAutoDismissMessage";
import {
  getBrowserApiBaseUrl,
  parseProjects,
} from "@/lib/projects-api";
import type { Project } from "@/lib/projects-api";
import { AdminToast } from "./AdminToast";
import { useAdminToast } from "@/hooks/useAdminToast";
import styles from "./EnquiryForm.module.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^\d{10}$/;
const serviceOptions = [
  "Custom Software Development",
  "Web Application Development",
  "Mobile App Development",
  "UI/UX Design",
  "E-commerce Development",
  "Maintenance & Support",
  "Other",
];
const budgetRanges = [
  "Under ₹1 Lakh",
  "₹1 - ₹3 Lakhs",
  "₹3 - ₹10 Lakhs",
  "₹10 Lakhs+",
];

export function EnquiryForm() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectError, setProjectError] = useAutoDismissMessage();
  const [submitting, setSubmitting] = useState(false);
  const { toasts, showSuccess, showError, dismissToast, clearAllToasts } =
    useAdminToast();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getBrowserApiBaseUrl()}/projects`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Projects API returned HTTP ${response.status}.`);
        setProjects(parseProjects(await response.json()));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProjectError(
          error instanceof Error ? error.message : "Unable to load projects.",
        );
      });

    return () => controller.abort();
  }, [setProjectError]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAllToasts();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const projectId = String(formData.get("projectId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const companyName = String(formData.get("companyName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const serviceRequired = String(formData.get("serviceRequired") ?? "");
    const budgetRange = String(formData.get("budgetRange") ?? "");
    const enquiryMessage = String(formData.get("message") ?? "").trim();

    if (name.length < 2) {
      showError("Please enter a valid name.");
      return;
    }
    if (!emailPattern.test(email) || email.length > 254) {
      showError("Please enter a valid email address.");
      return;
    }
    if (!phonePattern.test(phone)) {
      showError("Please enter a 10-digit mobile number.");
      return;
    }
    if (!serviceOptions.includes(serviceRequired)) {
      showError("Please select a service.");
      return;
    }
    if (enquiryMessage.length < 5) {
      showError("Please enter a project description of at least 5 characters.");
      return;
    }
    if (companyName.length > 160 || (budgetRange && !budgetRanges.includes(budgetRange))) {
      showError("Please check the optional company and budget fields.");
      return;
    }

    const body = {
      name,
      ...(companyName ? { companyName } : {}),
      email,
      phone,
      serviceRequired,
      ...(budgetRange ? { budgetRange } : {}),
      message: enquiryMessage,
      ...(projectId ? { projectId } : {}),
    };

    setSubmitting(true);
    try {
      const response = await fetch(
        `${getBrowserApiBaseUrl()}/enquiries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const result: unknown = await response.json();
        const error =
          result && typeof result === "object" && "message" in result
            ? result.message
            : null;
        const errorMessage = Array.isArray(error)
          ? error.filter((item): item is string => typeof item === "string").join(" ")
          : typeof error === "string"
            ? error
            : null;
        throw new Error(errorMessage || `Enquiry API returned HTTP ${response.status}.`);
      }

      form.reset();
      showSuccess("Thanks — your message has been sent.");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Your message could not be sent. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <AdminToast
        toasts={toasts}
        onDismiss={dismissToast}
        placement="bottom"
      />
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>
            Name <span className={styles.requiredMarker} aria-hidden="true">*</span>
          </span>
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Your name"
          />
        </label>
        <label className={styles.field}>
          <span>Company name</span>
          <input
            name="companyName"
            autoComplete="organization"
            maxLength={160}
            placeholder="Your company"
          />
        </label>
        <label className={styles.field}>
          <span>
            Work email <span className={styles.requiredMarker} aria-hidden="true">*</span>
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
            title="Enter a valid email address, for example name@example.com."
            placeholder="you@example.com"
          />
        </label>
        <label className={styles.field}>
          <span>
            Phone number <span className={styles.requiredMarker} aria-hidden="true">*</span>
          </span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            minLength={10}
            maxLength={10}
            title="Enter a 10-digit mobile number."
            required
            placeholder="10-digit mobile number"
          />
        </label>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>
            Service required <span className={styles.requiredMarker} aria-hidden="true">*</span>
          </span>
          <select
            name="serviceRequired"
            defaultValue=""
            required
          >
            <option value="" disabled>Select a service</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Related project</span>
          <select name="projectId" defaultValue="">
            <option value="">No specific project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectName}
              </option>
            ))}
          </select>
        </label>
      </div>
      {projectError && (
        <p className={styles.formError} role="status">
          {projectError}
        </p>
      )}
      <fieldset className={`${styles.budgetField} ${styles.messageField}`}>
        <legend>Project budget range</legend>
        <div className={styles.budgetOptions}>
          {budgetRanges.map((range) => (
            <label className={styles.budgetOption} key={range}>
              <input
                type="radio"
                name="budgetRange"
                value={range}
                aria-label={range}
              />
              <span>{range}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className={`${styles.field} ${styles.messageField}`}>
        <span>
          Project description{" "}
          <span className={styles.requiredMarker} aria-hidden="true">*</span>
        </span>
        <textarea
          name="message"
          required
          minLength={5}
          maxLength={5000}
          rows={6}
          placeholder="Describe your technical objectives, timelines, and deliverables..."
        />
      </label>
      <div className={styles.formActions}>
        <button className={styles.submitButton} type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send project inquiry"}
          {!submitting && <span aria-hidden="true">→</span>}
        </button>
      </div>
    </form>
  );
}
