"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import type { ActionResult } from "../../_lib/dto";
import {
  audienceIncludes,
  POST_LIMITS,
  type PostFormState,
  postSourcesFor,
} from "../../_lib/posts";
import { getCurrentUser } from "../auth/dal";
import { getDb, schema } from "../db";
import { findPostAuthor } from "./queries";

const { posts, pollOptions, pollVotes } = schema;

const SERVER_ERROR = "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

const PostSchema = z.object({
  source: z.enum(["academic", "council"], {
    error: "Хэний нэрээр гэдгээ сонгоно уу.",
  }),
  audience: z.enum(["all", "students", "teachers"], {
    error: "Хэнд зориулсныг сонгоно уу.",
  }),
  title: z
    .string()
    .min(3, { error: "Гарчгаа бичнэ үү." })
    .max(POST_LIMITS.title, { error: "Гарчиг хэт урт байна." }),
  body: z.string().max(POST_LIMITS.body, { error: "Агуулга хэт урт байна." }),
  options: z
    .array(
      z.string().max(POST_LIMITS.option, { error: "Хариулт хэт урт байна." }),
    )
    .refine((options) => options.length === 0 || options.length >= 2, {
      error: "Санал асуулгад дор хаяж 2 хариулт оруулна уу.",
    })
    .refine((options) => options.length <= POST_LIMITS.options, {
      error: `Хамгийн ихдээ ${POST_LIMITS.options} хариулт.`,
    })
    .refine(
      (options) =>
        new Set(options.map((option) => option.toLowerCase())).size ===
        options.length,
      { error: "Ижил хариулт давхардсан байна." },
    ),
});

/** Зарлал (сонголттой бол санал асуулга) нийтэлнэ. */
export async function createPost(
  _previous: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const user = await requireUser();
  const allowed = postSourcesFor(user);
  if (!allowed.length) return { error: "Танд зарлал оруулах эрх алга." };

  const isPoll = formData.get("isPoll") === "on";
  const parsed = PostSchema.safeParse({
    source: field(formData, "source") || allowed[0],
    audience: field(formData, "audience") || "all",
    title: field(formData, "title"),
    body: field(formData, "body"),
    options: isPoll
      ? formData
          .getAll("option")
          .map((value) => String(value).trim())
          .filter(Boolean)
      : [],
  });
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      fieldErrors: {
        source: fields.source?.[0],
        audience: fields.audience?.[0],
        title: fields.title?.[0],
        body: fields.body?.[0],
        options: fields.options?.[0],
      },
    };
  }
  const { source, audience, title, body, options } = parsed.data;
  if (!allowed.includes(source)) {
    return { fieldErrors: { source: "Энэ нэрээр оруулах эрх алга." } };
  }
  if (isPoll && options.length === 0) {
    return {
      fieldErrors: { options: "Санал асуулгад дор хаяж 2 хариулт оруулна уу." },
    };
  }
  if (!isPoll && !body) {
    return { fieldErrors: { body: "Зарлалын агуулгаа бичнэ үү." } };
  }

  try {
    await getDb().transaction(async (tx) => {
      const [post] = await tx
        .insert(posts)
        .values({ source, audience, title, body, authorId: user.id })
        .returning({ id: posts.id });
      if (options.length) {
        await tx.insert(pollOptions).values(
          options.map((label, position) => ({
            postId: post.id,
            label,
            position,
          })),
        );
      }
    });
  } catch (error) {
    console.error("createPost failed", error);
    return { error: SERVER_ERROR };
  }
  refresh();
  return {
    ok: true,
    message: options.length
      ? "Санал асуулга нийтлэгдлээ."
      : "Зарлал нийтлэгдлээ.",
  };
}

/** Санал өгөх эсвэл саналаа солих. */
export async function votePoll(
  postId: string,
  optionId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (
    !z.uuid().safeParse(postId).success ||
    !z.uuid().safeParse(optionId).success
  ) {
    return { ok: false, error: "Санал асуулга олдсонгүй." };
  }
  try {
    const db = getDb();
    const [option] = await db
      .select({ id: pollOptions.id, audience: posts.audience })
      .from(pollOptions)
      .innerJoin(posts, eq(posts.id, pollOptions.postId))
      .where(and(eq(pollOptions.id, optionId), eq(pollOptions.postId, postId)))
      .limit(1);
    // Өөрт хамааралгүй санал асуулгад санал өгөхгүй.
    if (!option || !audienceIncludes(option.audience, user.role)) {
      return { ok: false, error: "Санал асуулга олдсонгүй." };
    }
    await db
      .insert(pollVotes)
      .values({ postId, optionId, userId: user.id })
      .onConflictDoUpdate({
        target: [pollVotes.postId, pollVotes.userId],
        set: { optionId, createdAt: new Date() },
      });
  } catch (error) {
    console.error("votePoll failed", error);
    return { ok: false, error: SERVER_ERROR };
  }
  refresh();
  return { ok: true };
}

/** Админ бүх зарлалыг, бусад нь өөрийн оруулсныг устгана. */
export async function deletePost(postId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!z.uuid().safeParse(postId).success) {
    return { ok: false, error: "Зарлал олдсонгүй." };
  }
  try {
    const post = await findPostAuthor(postId);
    if (!post) return { ok: false, error: "Зарлал олдсонгүй." };
    if (user.role !== "admin" && post.authorId !== user.id) {
      return { ok: false, error: "Энэ зарлалыг устгах эрх алга." };
    }
    await getDb().delete(posts).where(eq(posts.id, postId));
  } catch (error) {
    console.error("deletePost failed", error);
    return { ok: false, error: SERVER_ERROR };
  }
  refresh();
  return { ok: true, message: "Зарлал устгагдлаа." };
}
