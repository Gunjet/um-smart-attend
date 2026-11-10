"use client";

import { useState } from "react";
import { LocationError, requestLocation } from "../../_lib/device-location";
import {
  type CampusSettings,
  DEFAULT_RADIUS_M,
  formatDistance,
  mapLink,
} from "../../_lib/geo";
import type { Notify } from "../../_lib/types";
import {
  clearCampusLocation,
  saveCampusLocation,
} from "../../_server/admin/campus-actions";
import { MapPinIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";
import { Field, FormError, inputClass, useAdminAction } from "./user-forms";

const round = (value: number) => String(Math.round(value * 1e6) / 1e6);

/**
 * Сургуулийн байршил: оюутан ирц бүртгүүлэхэд утасных нь байршил
 * энэ цэгээс радиус дотор байх ёстой.
 */
export function CampusPanel({
  campus,
  notify,
}: {
  campus: CampusSettings | null;
  notify: Notify;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:ml-60 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Сургуулийн байршил
        </h1>
        <p className="mt-1 text-[15px] text-slate-500">
          Радиусаас гадна байгаа оюутны ирц бүртгэгдэхгүй.
        </p>
      </div>

      <StatusCard campus={campus} notify={notify} />

      <section className="mt-4 rounded-xl border border-slate-200 bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {campus ? "Байршил өөрчлөх" : "Байршил тохируулах"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Сургууль дээр байхдаа «Одоогийн байршлыг ашиглах» товчийг дарвал
          хамгийн зөв.
        </p>
        <CampusForm
          key={JSON.stringify(campus)}
          campus={campus}
          notify={notify}
        />
      </section>
    </div>
  );
}

function StatusCard({
  campus,
  notify,
}: {
  campus: CampusSettings | null;
  notify: Notify;
}) {
  const [state, onSubmit, pending] = useAdminAction(
    clearCampusLocation,
    notify,
  );

  if (!campus) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-surface p-5">
        <p className="font-medium text-slate-700">
          Байршлын шалгалт идэвхгүй байна
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Байршил тохируулах хүртэл оюутнуудын байршлыг шалгахгүй.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <MapPinIcon />
          </span>
          <div>
            <p className="font-semibold text-slate-900">
              Байршлын шалгалт идэвхтэй
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Радиус {formatDistance(campus.radiusM)} ·{" "}
              <span className="tabular-nums">
                {round(campus.latitude)}, {round(campus.longitude)}
              </span>
            </p>
            <a
              href={mapLink(campus)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-900"
            >
              Газрын зураг дээр харах ↗
            </a>
          </div>
        </div>
        <form onSubmit={onSubmit}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
          >
            {pending ? "Унтрааж байна…" : "Шалгалтыг унтраах"}
          </button>
        </form>
      </div>
      <FormError message={state?.error} />
    </div>
  );
}

function CampusForm({
  campus,
  notify,
}: {
  campus: CampusSettings | null;
  notify: Notify;
}) {
  const [state, onSubmit, pending] = useAdminAction(saveCampusLocation, notify);
  const [latitude, setLatitude] = useState(
    campus ? round(campus.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    campus ? round(campus.longitude) : "",
  );
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
      setLocateInfo({
        text: `Нарийвчлал ±${formatDistance(location.accuracy)}.`,
        warn: location.accuracy > 100,
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
          {locateInfo.warn &&
            !locateInfo.text.includes("зөвшөөр") &&
            " Нарийвчлал муу байна — утаснаас, гадаа эсвэл цонхны дэргэд дахин оролдоно уу."}
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
            placeholder="43.57"
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
            placeholder="104.42"
          />
        </Field>
      </div>

      <Field
        label="Зөвшөөрөх радиус (метр)"
        htmlFor="campus-radius"
        error={errors?.radiusM}
        hint="Барилга дотор GPS 20–80 м алддаг тул 150 м-ээс багагүй байлгахыг зөвлөж байна."
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
          defaultValue={campus?.radiusM ?? DEFAULT_RADIUS_M}
        />
      </Field>

      <FormError message={state?.error} />
      <button
        type="submit"
        disabled={pending}
        className={cx(primaryButtonClass, "w-full sm:w-auto")}
      >
        {pending ? "Хадгалж байна…" : "Хадгалах"}
      </button>
    </form>
  );
}
