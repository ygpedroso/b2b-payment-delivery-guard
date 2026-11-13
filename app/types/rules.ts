export enum RuleStatus {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
}

export enum PostalCodeType {
  PREFIX = "PREFIX",
  REGEX = "REGEX",
  LIST = "LIST",
}

export enum RuleType {
  PAYMENT = "payment",
  DELIVERY = "delivery",
}

export enum ActionType {
  HIDE = "HIDE",
  MOVE_TO_BOTTOM = "MOVE_TO_BOTTOM",
  MOVE_TO_TOP = "MOVE_TO_TOP",
}

export enum PriorityLevel {
  HIGHEST = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
  LOWEST = 5,
}

export const PRIORITY_OPTIONS = [
  { label: "Highest", value: "1" },
  { label: "High", value: "2" },
  { label: "Medium", value: "3" },
  { label: "Low", value: "4" },
  { label: "Lowest", value: "5" },
];

export function getPriorityLabel(priority?: number | null): string {
  switch (priority) {
    case 1:
      return "Highest";
    case 2:
      return "High";
    case 3:
      return "Medium";
    case 4:
      return "Low";
    case 5:
      return "Lowest";
    default:
      return "Medium";
  }
}

export function getPriorityBadgeTone(priority?: number | null): "critical" | "warning" | "info" | "subdued" {
  switch (priority) {
    case 1:
      return "critical";
    case 2:
      return "warning";
    case 3:
      return "info";
    case 4:
    case 5:
      return "subdued";
    default:
      return "info";
  }
}
