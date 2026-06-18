import type { EmployeeNotification, EmployeeNotificationType } from "@/lib/types";

export function getNotificationActorName(
  notification: EmployeeNotification
): string | null {
  const name = notification.metadata?.actor_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function getNotificationTypeLabel(type: EmployeeNotificationType): string {
  switch (type) {
    case "chat_message":
      return "Team Message";
    case "deployment_update":
      return "Deployment";
    case "accomplishment":
      return "Accomplishment";
    case "mobilization":
      return "Mobilization";
    case "team_leader_action":
      return "Team Update";
    default:
      return "Alert";
  }
}

export function getNotificationTypeColor(type: EmployeeNotificationType): string {
  switch (type) {
    case "chat_message":
      return "#1e3a5f";
    case "deployment_update":
      return "#b45309";
    case "accomplishment":
      return "#047857";
    case "mobilization":
      return "#7c3aed";
    case "team_leader_action":
      return "#0369a1";
    default:
      return "#1e3a5f";
  }
}
