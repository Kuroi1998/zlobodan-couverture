export const CONTACT_MESSAGE_STATUSES = [
  "new",
  "read",
  "in_progress",
  "replied",
  "closed",
  "archived",
  "spam",
] as const;

export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

export const QUOTE_REQUEST_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "contacted",
  "visit_scheduled",
  "estimate_in_preparation",
  "estimate_sent",
  "accepted",
  "rejected",
  "cancelled",
  "archived",
] as const;

export type QuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number];
export const QUOTE_DRAFT_RETENTION_DAYS = 30;

const CONTACT_TRANSITIONS: Record<ContactMessageStatus, readonly ContactMessageStatus[]> = {
  new: ["read", "in_progress", "spam", "archived"],
  read: ["in_progress", "replied", "closed", "spam", "archived"],
  in_progress: ["replied", "closed", "spam", "archived"],
  replied: ["in_progress", "closed", "archived"],
  closed: ["in_progress", "archived"],
  archived: ["in_progress"],
  spam: ["new", "archived"],
};

const QUOTE_REQUEST_TRANSITIONS: Record<QuoteRequestStatus, readonly QuoteRequestStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "contacted", "cancelled", "archived"],
  under_review: ["contacted", "visit_scheduled", "estimate_in_preparation", "cancelled", "archived"],
  contacted: ["under_review", "visit_scheduled", "estimate_in_preparation", "cancelled", "archived"],
  visit_scheduled: ["under_review", "estimate_in_preparation", "cancelled", "archived"],
  estimate_in_preparation: ["estimate_sent", "cancelled", "archived"],
  estimate_sent: ["accepted", "rejected", "cancelled", "archived"],
  accepted: ["archived"],
  rejected: ["under_review", "archived"],
  cancelled: ["under_review", "archived"],
  archived: [],
};

export function isContactMessageStatus(value: string): value is ContactMessageStatus {
  return (CONTACT_MESSAGE_STATUSES as readonly string[]).includes(value);
}

export function isQuoteRequestStatus(value: string): value is QuoteRequestStatus {
  return (QUOTE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function canTransitionContactMessage(
  from: ContactMessageStatus,
  to: ContactMessageStatus
): boolean {
  return CONTACT_TRANSITIONS[from].includes(to);
}

export function canTransitionQuoteRequest(
  from: QuoteRequestStatus,
  to: QuoteRequestStatus
): boolean {
  return QUOTE_REQUEST_TRANSITIONS[from].includes(to);
}

export function allowedContactMessageTransitions(
  status: ContactMessageStatus
): readonly ContactMessageStatus[] {
  return CONTACT_TRANSITIONS[status];
}

export function allowedQuoteRequestTransitions(
  status: QuoteRequestStatus
): readonly QuoteRequestStatus[] {
  return QUOTE_REQUEST_TRANSITIONS[status];
}

export const REQUEST_TRANSITION_TABLES = {
  CONTACT_TRANSITIONS,
  QUOTE_REQUEST_TRANSITIONS,
};
