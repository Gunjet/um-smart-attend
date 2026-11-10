/** "Б. Энхжин" → { firstName: "Энхжин", initials: "ЭБ" } */
export function nameParts(fullName: string) {
  const [surname = "", ...rest] = fullName.split(/\.\s*|\s+/).filter(Boolean);
  const firstName = rest.join(" ") || surname;
  const initials = `${firstName.charAt(0)}${rest.length ? surname.charAt(0) : ""}`;
  return { firstName, initials: initials.toUpperCase() };
}
