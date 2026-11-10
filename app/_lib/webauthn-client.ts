/** Face ID / хурууны хээний (WebAuthn) алдааг ойлгомжтой болгоно. */
export function describeWebAuthnError(error: unknown, registering = false) {
  const name = (error as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "AbortError") {
    return registering
      ? "Бүртгэл цуцлагдлаа. iPhone дээр Тохиргоо → General → AutoFill & Passwords асаалттай эсэхийг шалгаад дахин оролдоно уу."
      : "Баталгаажуулалт цуцлагдлаа. Хэрэв энэ утас таны Face ID бүртгүүлсэн утас биш бол бүртгүүлсэн утаснаасаа оролдоно уу.";
  }
  if (name === "InvalidStateError" && registering) {
    return "Энэ утсанд аль хэдийн бүртгэгдсэн байна. Админд хандана уу.";
  }
  if (name === "NotSupportedError" || name === "SecurityError") {
    return "Энэ хөтөч Face ID / хурууны хээ дэмжихгүй байна. Safari эсвэл Chrome ашиглана уу.";
  }
  return "Face ID ажилласангүй. Дахин оролдоно уу.";
}
