export interface RecordRow {
  id: string;
  type: string;
  occurredAt: Date;
  data: unknown;
  source: string;
  userId: string | null;
}
