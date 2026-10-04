export type Status = "TODO" | "DOING" | "DONE";
export type StatusFilter = Status | "ALL";
export interface Task {
  id: number;
  title: string;
  description: string;
  status: Status;
  owner: string;
}
export interface Filters {
  q: string;
  status: StatusFilter;
  page: number;
}
