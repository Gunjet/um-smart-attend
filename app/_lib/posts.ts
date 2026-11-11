import type { SessionUser } from "./types";

export type PostSource = "academic" | "council";

export const POST_SOURCE_LABEL: Record<PostSource, string> = {
  academic: "Сургалтын алба",
  council: "Оюутны зөвлөл",
};

export const POST_LIMITS = {
  title: 120,
  body: 4000,
  options: 6,
  option: 80,
} as const;

export type PostItem = {
  id: string;
  source: PostSource;
  title: string;
  body: string;
  /** "2026.11.11 14:05" (Улаанбаатарын цагаар). */
  createdAt: string;
  canDelete: boolean;
  poll: {
    options: { id: string; label: string; votes: number }[];
    total: number;
    /** Миний өгсөн санал (өгөөгүй бол null). */
    myOptionId: string | null;
  } | null;
};

export type PostFormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<
    Record<"source" | "title" | "body" | "options", string>
  >;
} | null;

/** Хэрэглэгч ямар нэрээр зарлал оруулж болох вэ. */
export function postSourcesFor(
  user: Pick<SessionUser, "role" | "isCouncil">,
): PostSource[] {
  if (user.role === "admin") return ["academic", "council"];
  if (user.role === "student" && user.isCouncil) return ["council"];
  return [];
}
