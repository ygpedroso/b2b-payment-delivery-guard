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
