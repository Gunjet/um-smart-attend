"use server";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./dal";
import { getDb, schema } from "../db";
import {
  hasPasskey,
  relyingParty,
  RP_NAME,
  saveChallenge,
  takeChallenge,
  userPasskeys,
} from "./webauthn";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const SERVER_ERROR = {
  ok: false as const,
  error: "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.",
};

async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user.role === "student" ? user : null;
}

/** Face ID / хурууны хээ бүртгэх сонголтууд (challenge-тэй). */
export async function startPasskeyRegistration(): Promise<
  Result<{ options: PublicKeyCredentialCreationOptionsJSON }>
> {
  const student = await requireStudent();
  if (!student) return { ok: false, error: "Зөвхөн оюутан бүртгүүлнэ." };
  try {
    if (await hasPasskey(student.id)) {
      return {
        ok: false,
        error: "Face ID аль хэдийн бүртгэгдсэн. Солих бол админд хандана уу.",
      };
    }
    const [row] = await getDb()
      .select({ code: schema.users.studentCode })
      .from(schema.users)
      .where(eq(schema.users.id, student.id))
      .limit(1);
    const { rpID } = await relyingParty();
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName: row?.code ?? student.name,
      userDisplayName: student.name,
      userID: isoUint8Array.fromUTF8String(student.id),
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      preferredAuthenticatorType: "localDevice",
    });
    await saveChallenge(student.id, options.challenge, "register");
    return { ok: true, options };
  } catch (error) {
    console.error("startPasskeyRegistration failed", error);
    return SERVER_ERROR;
  }
}

export async function finishPasskeyRegistration(
  response: RegistrationResponseJSON,
): Promise<Result<{ message: string }>> {
  const student = await requireStudent();
  if (!student) return { ok: false, error: "Зөвхөн оюутан бүртгүүлнэ." };
  try {
    const expectedChallenge = await takeChallenge(student.id, "register");
    if (!expectedChallenge) {
      return {
        ok: false,
        error: "Бүртгэлийн хугацаа дууссан. Дахин оролдоно уу.",
      };
    }
    if (await hasPasskey(student.id)) {
      return { ok: false, error: "Face ID аль хэдийн бүртгэгдсэн." };
    }
    const { rpID, origin } = await relyingParty();
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verified) {
      return {
        ok: false,
        error: "Бүртгэл баталгаажсангүй. Дахин оролдоно уу.",
      };
    }
    const { credential } = registrationInfo;
    await getDb()
      .insert(schema.passkeys)
      .values({
        id: credential.id,
        userId: student.id,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? null,
      });
  } catch (error) {
    console.error("finishPasskeyRegistration failed", error);
    return { ok: false, error: "Бүртгэл баталгаажсангүй. Дахин оролдоно уу." };
  }
  refresh();
  return { ok: true, message: "Face ID амжилттай бүртгэгдлээ." };
}

/** Ирц бүртгүүлэхэд Face ID-гаар баталгаажуулах сонголтууд. */
export async function startCheckInPasskey(): Promise<
  Result<{ options: PublicKeyCredentialRequestOptionsJSON }>
> {
  const student = await requireStudent();
  if (!student) return { ok: false, error: "Зөвхөн оюутан бүртгүүлнэ." };
  try {
    const credentials = await userPasskeys(student.id);
    if (!credentials.length) {
      return { ok: false, error: "Эхлээд Face ID-гаа бүртгүүлнэ үү." };
    }
    const { rpID } = await relyingParty();
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: credentials.map((item) => ({
        id: item.id,
        transports: item.transports ?? undefined,
      })),
    });
    await saveChallenge(student.id, options.challenge, "checkin");
    return { ok: true, options };
  } catch (error) {
    console.error("startCheckInPasskey failed", error);
    return SERVER_ERROR;
  }
}
