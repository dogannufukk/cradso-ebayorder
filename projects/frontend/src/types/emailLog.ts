export const EmailStatus = {
  Pending: 0,
  Sending: 1,
  Sent: 2,
  Failed: 3,
} as const;
export type EmailStatus = (typeof EmailStatus)[keyof typeof EmailStatus];

export interface EmailLogItem {
  id: string;
  toEmail: string;
  subject: string;
  templateName: string;
  status: EmailStatus;
  retryCount: number;
  maxRetries: number;
  sentAt: string | null;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdDate: string;
}
