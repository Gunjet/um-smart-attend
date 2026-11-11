"use client";

import {
  type FormEvent,
  Fragment,
  startTransition,
  useActionState,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import {
  POST_AUDIENCE_LABEL,
  POST_LIMITS,
  POST_SOURCE_LABEL,
  type PostAudience,
  type PostFormState,
  type PostItem,
  type PostSource,
} from "../../_lib/posts";
import type { Notify } from "../../_lib/types";
import { createPost, deletePost, votePoll } from "../../_server/posts/actions";
import { CheckIcon, CloseIcon, PlusIcon, TrashIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-surface px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100";

const AUDIENCES: PostAudience[] = ["all", "students", "teachers"];

/** Нийтлэх үеийн сонголтын нэр. */
const AUDIENCE_CHOICE: Record<PostAudience, string> = {
  all: "Бүгдэд",
  students: "Оюутнуудад",
  teachers: "Багш нарт",
};

const SOURCE_BADGE: Record<PostSource, string> = {
  academic: "bg-emerald-50 text-emerald-800",
  council: "bg-sky-50 text-sky-800",
};

/**
 * Сургалтын алба, Оюутны зөвлөлийн зарлал ба санал асуулга.
 * Бүх хэрэглэгч харж, санал өгнө; эрхтэй нь нийтэлнэ.
 */
export function PostsPage({
  posts,
  sources,
  notify,
}: {
  posts: PostItem[];
  /** Хэрэглэгч ямар нэрээр нийтэлж болох (хоосон бол нийтлэхгүй). */
  sources: PostSource[];
  notify: Notify;
}) {
  const [composing, setComposing] = useState(false);
  const [composerKey, setComposerKey] = useState(0);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-5 sm:px-6 md:ml-60 md:pt-8">
      <div className="mb-5 mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Зарлал</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            Сургалтын алба, Оюутны зөвлөлийн мэдээ ба санал асуулга
          </p>
        </div>
        {sources.length > 0 && !composing && (
          <button
            type="button"
            className={cx(primaryButtonClass, "w-full sm:w-auto")}
            onClick={() => setComposing(true)}
          >
            <PlusIcon className="size-4" />
            Зарлал оруулах
          </button>
        )}
      </div>

      {composing && (
        <Composer
          key={composerKey}
          sources={sources}
          onCancel={() => setComposing(false)}
          onDone={(message) => {
            setComposing(false);
            setComposerKey((key) => key + 1);
            notify(message);
          }}
        />
      )}

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-surface p-10 text-center text-[15px] text-slate-500">
          Одоогоор зарлал алга.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} notify={notify} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- Нийтлэх ------------------------------- */

function Composer({
  sources,
  onCancel,
  onDone,
}: {
  sources: PostSource[];
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [state, dispatch, pending] = useActionState<PostFormState, FormData>(
    async (previous, formData) => {
      const result = await createPost(previous, formData);
      if (result?.ok) onDone(result.message ?? "");
      return result;
    },
    null,
  );
  const [isPoll, setIsPoll] = useState(false);
  const [options, setOptions] = useState(["", ""]);
  const errors = state?.fieldErrors;

  // Алдаа гарахад бичсэн утгууд арилахгүйн тулд onSubmit-ээр илгээнэ.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mb-5 space-y-4 rounded-2xl border border-slate-200 bg-surface p-4 sm:p-5"
    >
      {sources.length > 1 ? (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">
            Хэний нэрээр
          </legend>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <label key={source} className="cursor-pointer">
                <input
                  type="radio"
                  name="source"
                  value={source}
                  defaultChecked={index === 0}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-100">
                  {POST_SOURCE_LABEL[source]}
                </span>
              </label>
            ))}
          </div>
          <FieldError message={errors?.source} />
        </fieldset>
      ) : (
        <>
          <input type="hidden" name="source" value={sources[0]} />
          <p className="flex items-center gap-2 text-sm text-slate-500">
            Нийтлэгч:
            <span
              className={cx(
                "rounded-md px-2 py-0.5 font-semibold",
                SOURCE_BADGE[sources[0]],
              )}
            >
              {POST_SOURCE_LABEL[sources[0]]}
            </span>
          </p>
        </>
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">
          Хэнд
        </legend>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((audience) => (
            <label key={audience} className="cursor-pointer">
              <input
                type="radio"
                name="audience"
                value={audience}
                defaultChecked={audience === "all"}
                className="peer sr-only"
              />
              <span className="inline-flex items-center rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-800 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-100">
                {AUDIENCE_CHOICE[audience]}
              </span>
            </label>
          ))}
        </div>
        <FieldError message={errors?.audience} />
      </fieldset>

      <div>
        <label
          htmlFor="post-title"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {isPoll ? "Асуулт" : "Гарчиг"}
        </label>
        <input
          id="post-title"
          name="title"
          required
          maxLength={POST_LIMITS.title}
          className={inputClass}
          placeholder={
            isPoll
              ? "Жишээ нь: Спорт наадмыг аль өдөр зохион байгуулах вэ?"
              : "Жишээ нь: Оюутны эрдэм шинжилгээний хурал"
          }
        />
        <FieldError message={errors?.title} />
      </div>

      <div>
        <label
          htmlFor="post-body"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {isPoll ? "Тайлбар (заавал биш)" : "Агуулга"}
        </label>
        <textarea
          id="post-body"
          name="body"
          rows={isPoll ? 2 : 5}
          maxLength={POST_LIMITS.body}
          className={cx(inputClass, "resize-y")}
          placeholder="Огноо, байршил, бүртгүүлэх холбоос гэх мэт"
        />
        <FieldError message={errors?.body} />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-slate-700">
        <input
          type="checkbox"
          name="isPoll"
          checked={isPoll}
          onChange={(event) => setIsPoll(event.target.checked)}
          className="size-4 accent-emerald-700"
        />
        Санал асуулга болгох
      </label>

      {isPoll && (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-slate-700">
            Хариултууд
          </legend>
          {options.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                name="option"
                value={value}
                maxLength={POST_LIMITS.option}
                aria-label={`${index + 1}-р хариулт`}
                placeholder={`${index + 1}-р хариулт`}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((item, i) =>
                      i === index ? event.target.value : item,
                    ),
                  )
                }
                className={inputClass}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  aria-label="Хариулт хасах"
                  onClick={() =>
                    setOptions((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <CloseIcon className="size-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < POST_LIMITS.options && (
            <button
              type="button"
              onClick={() => setOptions((current) => [...current, ""])}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-emerald-700 hover:bg-slate-100"
            >
              <PlusIcon className="size-4" />
              Хариулт нэмэх
            </button>
          )}
          <FieldError message={errors?.options} />
        </fieldset>
      )}

      {state?.error && (
        <p
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-surface px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Болих
        </button>
        <button
          type="submit"
          disabled={pending}
          className={cx(primaryButtonClass, "disabled:opacity-60")}
        >
          {pending ? "Нийтэлж байна…" : "Нийтлэх"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[13px] text-rose-700">{message}</p>;
}

/* -------------------------------- Карт -------------------------------- */

function PostCard({ post, notify }: { post: PostItem; notify: Notify }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();

  return (
    <li className="rounded-2xl border border-slate-200 bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          <span
            className={cx(
              "rounded-md px-2 py-0.5 font-semibold",
              SOURCE_BADGE[post.source],
            )}
          >
            {POST_SOURCE_LABEL[post.source]}
          </span>
          {post.poll && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              Санал асуулга
            </span>
          )}
          {post.audience !== "all" && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              {POST_AUDIENCE_LABEL[post.audience]}
            </span>
          )}
          <time className="tabular-nums text-slate-400">{post.createdAt}</time>
        </div>
        {post.canDelete &&
          (confirming ? (
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() =>
                  startDelete(async () => {
                    const result = await deletePost(post.id);
                    if (!result.ok) notify(result.error);
                    else if (result.message) notify(result.message);
                  })
                }
                className="rounded-md bg-rose-600 px-2.5 py-1 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? "Устгаж байна…" : "Устгах"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md px-2 py-1 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
              >
                Болих
              </button>
            </span>
          ) : (
            <button
              type="button"
              aria-label="Зарлал устгах"
              title="Устгах"
              onClick={() => setConfirming(true)}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
            >
              <TrashIcon className="size-4" />
            </button>
          ))}
      </div>

      <h2 className="mt-2.5 text-lg font-semibold leading-snug text-slate-900">
        {post.title}
      </h2>
      {post.body && (
        <p className="mt-1.5 whitespace-pre-line break-words text-[15px] leading-relaxed text-slate-700">
          <Linkified text={post.body} />
        </p>
      )}
      {post.poll && <Poll post={post} poll={post.poll} notify={notify} />}
    </li>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Текст доторх холбоосыг дарж болдог болгоно. */
function Linkified({ text }: { text: string }) {
  return text.split(URL_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-emerald-700 underline underline-offset-2"
      >
        {part}
      </a>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/* ---------------------------- Санал асуулга ---------------------------- */

type PollState = NonNullable<PostItem["poll"]>;

function Poll({
  post,
  poll,
  notify,
}: {
  post: PostItem;
  poll: PollState;
  notify: Notify;
}) {
  // Дармагц үр дүнг шууд харуулж, серверийн хариугаар баталгаажуулна.
  const [view, setVote] = useOptimistic(poll, (current, optionId: string) => {
    const previous = current.myOptionId;
    if (previous === optionId) return current;
    return {
      myOptionId: optionId,
      total: current.total + (previous ? 0 : 1),
      options: current.options.map((option) => ({
        ...option,
        votes:
          option.votes +
          (option.id === optionId ? 1 : 0) -
          (option.id === previous ? 1 : 0),
      })),
    };
  });
  const [pending, startVote] = useTransition();
  const voted = view.myOptionId !== null;

  const vote = (optionId: string) => {
    if (optionId === view.myOptionId) return;
    startVote(async () => {
      setVote(optionId);
      const result = await votePoll(post.id, optionId);
      if (!result.ok) notify(result.error);
    });
  };

  return (
    <div className="mt-4">
      <ul className="space-y-2" aria-label="Хариултууд">
        {view.options.map((option) => {
          const mine = option.id === view.myOptionId;
          const percent = view.total
            ? Math.round((option.votes / view.total) * 100)
            : 0;
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => vote(option.id)}
                disabled={pending}
                aria-pressed={mine}
                className={cx(
                  "relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition disabled:cursor-wait",
                  mine
                    ? "border-emerald-600"
                    : "border-slate-200 hover:border-slate-400",
                )}
              >
                {voted && (
                  <span
                    aria-hidden="true"
                    className={cx(
                      "absolute inset-y-0 left-0 transition-[width] duration-500",
                      mine ? "bg-emerald-50" : "bg-slate-100",
                    )}
                    style={{ width: `${percent}%` }}
                  />
                )}
                <span className="relative flex items-center justify-between gap-3">
                  <span
                    className={cx(
                      "flex min-w-0 items-center gap-2",
                      mine
                        ? "font-semibold text-emerald-900"
                        : "text-slate-800",
                    )}
                  >
                    {mine && <CheckIcon className="size-4 shrink-0" />}
                    <span className="break-words">{option.label}</span>
                  </span>
                  {voted && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-600">
                      {percent}%
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[13px] text-slate-500">
        {view.total} санал
        {voted
          ? " · Саналаа солих бол өөр хариулт дээр дарна уу."
          : " · Санал өгсний дараа дүн харагдана. Нэр нууцлагдана."}
      </p>
    </div>
  );
}
