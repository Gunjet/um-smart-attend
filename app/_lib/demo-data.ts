import type { Student } from "./types";

/** Seed скриптийн demo оюутнууд (`npm run db:seed`). */
export type RosterEntry = Pick<Student, "id" | "name" | "initials">;

export const ROSTER: RosterEntry[] = [
  { id: "22B1NUM0142", name: "Б. Энхжин", initials: "ЭБ" },
  { id: "22B1NUM0087", name: "М. Тэмүүлэн", initials: "ТМ" },
  { id: "22B1NUM0215", name: "С. Номин", initials: "НС" },
  { id: "22B1NUM0119", name: "Д. Анужин", initials: "АД" },
  { id: "22B1NUM0063", name: "Г. Мөнх-Оргил", initials: "МГ" },
  { id: "22B1NUM0184", name: "Н. Билгүүн", initials: "БН" },
  { id: "22B1NUM0208", name: "Ц. Ариунзаяа", initials: "АЦ" },
  { id: "22B1NUM0131", name: "Э. Марал", initials: "МЭ" },
  { id: "22B1NUM0196", name: "Т. Бат-Оргил", initials: "БТ" },
  { id: "22B1NUM0224", name: "О. Саруул", initials: "СО" },
  { id: "22B1NUM0108", name: "Х. Анхбаяр", initials: "АХ" },
  { id: "22B1NUM0167", name: "П. Нандин", initials: "НП" },
  { id: "22B1NUM0230", name: "Ж. Төгөлдөр", initials: "ТЖ" },
  { id: "22B1NUM0095", name: "Л. Энэрэл", initials: "ЭЛ" },
  { id: "22B1NUM0173", name: "Б. Амарсанаа", initials: "АБ" },
  { id: "22B1NUM0241", name: "Д. Хулан", initials: "ХД" },
  { id: "22B1NUM0126", name: "Р. Мөнхжин", initials: "МР" },
  { id: "22B1NUM0189", name: "Ш. Энх-Үжин", initials: "ЭШ" },
  { id: "22B1NUM0203", name: "А. Тэмүүлэн", initials: "ТА" },
  { id: "22B1NUM0112", name: "М. Ариунболд", initials: "АМ" },
  { id: "22B1NUM0256", name: "С. Уянга", initials: "УС" },
  { id: "22B1NUM0158", name: "Н. Билгүүнтөгс", initials: "БН" },
  { id: "22B1NUM0262", name: "Ц. Мишээл", initials: "МЦ" },
  { id: "22B1NUM0079", name: "Г. Бат-Эрдэнэ", initials: "БГ" },
  { id: "22B1NUM0271", name: "З. Солонго", initials: "СЗ" },
  { id: "22B1NUM0284", name: "У. Ихбаяр", initials: "ИУ" },
  { id: "22B1NUM0290", name: "Ч. Номин-Эрдэнэ", initials: "НЧ" },
  { id: "22B1NUM0301", name: "В. Мөнхсайхан", initials: "МВ" },
  { id: "22B1NUM0312", name: "Ё. Ану", initials: "АЁ" },
  { id: "22B1NUM0323", name: "И. Хүслэн", initials: "ХИ" },
  { id: "22B1NUM0331", name: "Д. Ганзориг", initials: "ГД" },
  { id: "22B1NUM0340", name: "Б. Баянзул", initials: "ББ" },
];
