import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { PostItem } from "../../_lib/posts";
import type { SessionUser } from "../../_lib/types";
import { getDb, schema } from "../db";

const { posts, pollOptions, pollVotes } = schema;

/** Сүүлийн зарлалууд, санал асуулгын дүнгийн хамт. */
export async function getPosts(
  user: Pick<SessionUser, "id" | "role">,
  limit = 50,
): Promise<PostItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: posts.id,
      source: posts.source,
      title: posts.title,
      body: posts.body,
      authorId: posts.authorId,
      createdAt: sql<string>`to_char(${posts.createdAt} at time zone 'Asia/Ulaanbaatar', 'YYYY.MM.DD HH24:MI')`,
    })
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  const [options, mine] = await Promise.all([
    db
      .select({
        id: pollOptions.id,
        postId: pollOptions.postId,
        label: pollOptions.label,
        votes: sql<number>`(select count(*)::int from poll_votes v where v.option_id = ${pollOptions.id})`,
      })
      .from(pollOptions)
      .where(inArray(pollOptions.postId, ids))
      .orderBy(asc(pollOptions.position)),
    db
      .select({ postId: pollVotes.postId, optionId: pollVotes.optionId })
      .from(pollVotes)
      .where(
        and(eq(pollVotes.userId, user.id), inArray(pollVotes.postId, ids)),
      ),
  ]);
  const myVote = new Map(mine.map((row) => [row.postId, row.optionId]));

  return rows.map(({ authorId, ...row }) => {
    const own = options
      .filter((option) => option.postId === row.id)
      .map(({ id, label, votes }) => ({ id, label, votes }));
    return {
      ...row,
      canDelete: user.role === "admin" || authorId === user.id,
      poll: own.length
        ? {
            options: own,
            total: own.reduce((sum, option) => sum + option.votes, 0),
            myOptionId: myVote.get(row.id) ?? null,
          }
        : null,
    };
  });
}

/** Нэг зарлалын эзэн (устгах эрх шалгахад). */
export async function findPostAuthor(postId: string) {
  const [row] = await getDb()
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  return row ?? null;
}
