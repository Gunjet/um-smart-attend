"use client";

import { useState } from "react";
import { LocationError, requestLocation } from "../../_lib/device-location";
import {
  type CampusSite,
  DEFAULT_RADIUS_M,
  formatDistance,
  mapLink,
} from "../../_lib/geo";
import type { Notify } from "../../_lib/types";
import {
  addCampusSite,
  deleteCampusSite,
} from "../../_server/admin/campus-actions";
import { MapPinIcon, TrashIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";
import { Field, FormError, inputClass, useAdminAction } from "./user-forms";

const round = (value: number) => String(Math.round(value * 1e6) / 1e6);

/**
 * Сургуулийн байрууд: оюутан ирц бүртгүүлэхэд утасных нь байршил аль нэг
 * байрны радиус дотор байх ёстой. Байр нэмээгүй бол байршил шалгахгүй.
 */
export function CampusPanel({
  sites,
  notify,
}: {
  sites: CampusSite[];
  notify: Notify;
}) {
  // Нэмэх бүрт форм цэвэрлэгдэнэ.
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Сургуулийн байршил
        </h1>
        <p className="mt-1 text-[15px] text-slate-500">
          Аль нэг байрны радиусаас гадна байгаа оюутны ирц бүртгэгдэхгүй.
        </p>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-surface p-5">
          <p className="font-medium text-slate-700">
            Байршлын шалгалт идэвхгүй байна
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Байр нэмэх хүртэл оюутнуудын байршлыг шалгахгүй.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sites.map((site) => (
            <SiteRow key={site.id} site={site} notify={notify} />
          ))}
        </ul>
      )}

      <section className="mt-4 rounded-xl border border-slate-200 bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Байр нэмэх</h2>
        <SiteForm
          key={formKey}
          defaultName={sites.length ? "" : "Үндсэн байр"}
          onDone={(message) => {
            notify(message);
            setFormKey((key) => key + 1);
          }}
        />
      </section>
    </div>
  );
}

function SiteRow({ site, notify }: { site: CampusSite; notify: Notify }) {
  const [state, onSubmit, pending] = useAdminAction(deleteCampusSite, notify);
  return (
    <li className="rounded-xl border border-emerald-200 bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <MapPinIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{site.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Радиус {formatDistance(site.radiusM)} ·{" "}
            <span className="tabular-nums">
              {round(site.latitude)}, {round(site.longitude)}
            </span>
          </p>
          <a
            href={mapLink(site)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            Газрын зураг дээр харах ↗
          </a>
        </div>
        <form onSubmit={onSubmit}>
          <input type="hidden" name="id" value={site.id} />
          <button
            type="submit"
            disabled={pending}
            title="Хасах"
            aria-label={`${site.name}-г хасах`}
            className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
          >
            <TrashIcon className="size-4" />
          </button>
        </form>
      </div>
      <FormError message={state?.error} />
    </li>
  );
}

function SiteForm({
  defaultName,
  onDone,
}: {
  defaultName: string;
  onDone: (message: string) => void;
}) {
  const [state, onSubmit, pending] = useAdminAction(addCampusSite, onDone);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateInfo, setLocateInfo] = useState<{
    text: string;
    warn: boolean;
  } | null>(null);
  const errors = state?.campusErrors;

  const useCurrentLocation = async () => {
    setLocating(true);
    setLocateInfo(null);
    try {
      const location = await requestLocation();
      setLatitude(round(location.latitude));
      setLongitude(round(location.longitude));
      const poor = location.accuracy > 100;
      setLocateInfo({
        text: `Нарийвчлал ±${formatDistance(location.accuracy)}.${poor ? " Нарийвчлал муу байна — гадаа эсвэл цонхны дэргэд дахин оролдоно уу." : ""}`,
        warn: poor,
      });
    } catch (cause) {
      setLocateInfo({
        text:
          cause instanceof LocationError
            ? cause.message
            : "Байршил авч чадсангүй.",
        warn: true,
      });
    } finally {
      setLocating(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
      <Field label="Байрны нэр" htmlFor="site-name" error={errors?.name}>
        <input
          id="site-name"
          name="name"
          className={inputClass}
          defaultValue={defaultName}
          autoComplete="off"
        />
      </Field>

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
      >
        <MapPinIcon className="size-4" />
        {locating ? "Байршил тодорхойлж байна…" : "Одоогийн байршлыг ашиглах"}
      </button>
      {locateInfo && (
        <p
          className={cx(
            "text-[13px]",
            locateInfo.warn ? "text-amber-700" : "text-slate-500",
          )}
        >
          {locateInfo.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Өргөрөг (latitude)"
          htmlFor="campus-latitude"
          error={errors?.latitude}
        >
          <input
            id="campus-latitude"
            name="latitude"
            inputMode="decimal"
            className={cx(inputClass, "tabular-nums")}
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
          />
        </Field>
        <Field
          label="Уртраг (longitude)"
          htmlFor="campus-longitude"
          error={errors?.longitude}
        >
          <input
            id="campus-longitude"
            name="longitude"
            inputMode="decimal"
            className={cx(inputClass, "tabular-nums")}
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Зөвшөөрөх радиус (метр)"
        htmlFor="campus-radius"
        error={errors?.radiusM}
      >
        <input
          id="campus-radius"
          name="radiusM"
          type="number"
          inputMode="numeric"
          min={20}
          max={5000}
          step={10}
          className={cx(inputClass, "tabular-nums")}
          defaultValue={DEFAULT_RADIUS_M}
        />
      </Field>

      <FormError message={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className={cx(primaryButtonClass, "w-full sm:w-auto")}
      >
        {pending ? "Хадгалж байна…" : "Нэмэх"}
      </button>
    </form>
  );
}
