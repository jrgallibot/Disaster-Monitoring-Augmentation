import { formatMobilizationDate, getMobilizationStatusLabel } from "@/lib/mobilization";
import type {
  AuditTrailEntry,
  EmployeeDeploymentLog,
  EmployeeMobilizationLog,
  EmployeeUpdateLog,
  EmployeeWithRelations,
} from "@/lib/types";
import { getFullName } from "@/lib/utils";

export function employeeDisplayName(employee: EmployeeWithRelations): string {
  return getFullName(employee.first_name, employee.last_name, employee.middle_name);
}

export function profileLogToAuditEntry(
  log: EmployeeUpdateLog,
  employee: EmployeeWithRelations | undefined,
  actorLabel: string
): AuditTrailEntry {
  const details: string[] = [];
  if (log.changes && Object.keys(log.changes).length > 0) {
    for (const [field, change] of Object.entries(log.changes)) {
      details.push(
        `${field.replace(/_/g, " ")}: ${change.from ?? "—"} → ${change.to ?? "—"}`
      );
    }
  }
  if (log.status_name) {
    details.push(`Status at update: ${log.status_name}`);
  }
  if (log.deployment_location) {
    details.push(`Location: ${log.deployment_location}`);
  }

  return {
    id: `profile-${log.id}`,
    category: "profile",
    created_at: log.created_at,
    employee_id: log.employee_id,
    employee_code: employee?.employee_id ?? "—",
    employee_name: employee ? employeeDisplayName(employee) : "Unknown employee",
    actor_label: actorLabel,
    title: log.summary,
    details,
  };
}

export function deploymentLogToAuditEntry(
  log: EmployeeDeploymentLog,
  employee: EmployeeWithRelations | undefined,
  actorLabel: string
): AuditTrailEntry {
  const details: string[] = [];
  if (log.actual_task) details.push(`Actual task: ${log.actual_task}`);
  if (log.deployment_location) details.push(`Location: ${log.deployment_location}`);
  if (log.deployment_remarks) details.push(`Remarks: ${log.deployment_remarks}`);

  return {
    id: `deployment-${log.id}`,
    category: "deployment",
    created_at: log.created_at,
    employee_id: log.employee_id,
    employee_code: employee?.employee_id ?? "—",
    employee_name: employee ? employeeDisplayName(employee) : "Unknown employee",
    actor_label: actorLabel,
    title: `Deployment status set to ${log.status_name}`,
    details,
  };
}

export function mobilizationLogToAuditEntry(
  log: EmployeeMobilizationLog,
  employee: EmployeeWithRelations | undefined,
  actorLabel: string
): AuditTrailEntry {
  const details = [
    `Mobilized: ${formatMobilizationDate(log.mobilized_at)}`,
    `Demobilized: ${formatMobilizationDate(log.demobilized_at)}`,
  ];

  return {
    id: `mobilization-${log.id}`,
    category: "mobilization",
    created_at: log.created_at,
    employee_id: log.employee_id,
    employee_code: employee?.employee_id ?? "—",
    employee_name: employee ? employeeDisplayName(employee) : "Unknown employee",
    actor_label: actorLabel,
    title: `Augmentation status: ${getMobilizationStatusLabel(log.mobilization_status)}`,
    details,
  };
}
