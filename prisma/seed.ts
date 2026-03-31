import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// -----------------------------------------------------------------------------
// Surah data — all 114 chapters of the Quran
// -----------------------------------------------------------------------------
const SURAHS: {
  id: number;
  arabicName: string;
  englishName: string;
  ayahCount: number;
}[] = [
  { id: 1, arabicName: "الفاتحة", englishName: "Al-Fatihah", ayahCount: 7 },
  { id: 2, arabicName: "البقرة", englishName: "Al-Baqarah", ayahCount: 286 },
  { id: 3, arabicName: "آل عمران", englishName: "Ali 'Imran", ayahCount: 200 },
  { id: 4, arabicName: "النساء", englishName: "An-Nisa", ayahCount: 176 },
  { id: 5, arabicName: "المائدة", englishName: "Al-Ma'idah", ayahCount: 120 },
  { id: 6, arabicName: "الأنعام", englishName: "Al-An'am", ayahCount: 165 },
  { id: 7, arabicName: "الأعراف", englishName: "Al-A'raf", ayahCount: 206 },
  { id: 8, arabicName: "الأنفال", englishName: "Al-Anfal", ayahCount: 75 },
  { id: 9, arabicName: "التوبة", englishName: "At-Tawbah", ayahCount: 129 },
  { id: 10, arabicName: "يونس", englishName: "Yunus", ayahCount: 109 },
  { id: 11, arabicName: "هود", englishName: "Hud", ayahCount: 123 },
  { id: 12, arabicName: "يوسف", englishName: "Yusuf", ayahCount: 111 },
  { id: 13, arabicName: "الرعد", englishName: "Ar-Ra'd", ayahCount: 43 },
  { id: 14, arabicName: "إبراهيم", englishName: "Ibrahim", ayahCount: 52 },
  { id: 15, arabicName: "الحجر", englishName: "Al-Hijr", ayahCount: 99 },
  { id: 16, arabicName: "النحل", englishName: "An-Nahl", ayahCount: 128 },
  { id: 17, arabicName: "الإسراء", englishName: "Al-Isra", ayahCount: 111 },
  { id: 18, arabicName: "الكهف", englishName: "Al-Kahf", ayahCount: 110 },
  { id: 19, arabicName: "مريم", englishName: "Maryam", ayahCount: 98 },
  { id: 20, arabicName: "طه", englishName: "Ta-Ha", ayahCount: 135 },
  { id: 21, arabicName: "الأنبياء", englishName: "Al-Anbiya", ayahCount: 112 },
  { id: 22, arabicName: "الحج", englishName: "Al-Hajj", ayahCount: 78 },
  {
    id: 23,
    arabicName: "المؤمنون",
    englishName: "Al-Mu'minun",
    ayahCount: 118,
  },
  { id: 24, arabicName: "النور", englishName: "An-Nur", ayahCount: 64 },
  { id: 25, arabicName: "الفرقان", englishName: "Al-Furqan", ayahCount: 77 },
  { id: 26, arabicName: "الشعراء", englishName: "Ash-Shu'ara", ayahCount: 227 },
  { id: 27, arabicName: "النمل", englishName: "An-Naml", ayahCount: 93 },
  { id: 28, arabicName: "القصص", englishName: "Al-Qasas", ayahCount: 88 },
  { id: 29, arabicName: "العنكبوت", englishName: "Al-Ankabut", ayahCount: 69 },
  { id: 30, arabicName: "الروم", englishName: "Ar-Rum", ayahCount: 60 },
  { id: 31, arabicName: "لقمان", englishName: "Luqman", ayahCount: 34 },
  { id: 32, arabicName: "السجدة", englishName: "As-Sajdah", ayahCount: 30 },
  { id: 33, arabicName: "الأحزاب", englishName: "Al-Ahzab", ayahCount: 73 },
  { id: 34, arabicName: "سبأ", englishName: "Saba", ayahCount: 54 },
  { id: 35, arabicName: "فاطر", englishName: "Fatir", ayahCount: 45 },
  { id: 36, arabicName: "يس", englishName: "Ya-Sin", ayahCount: 83 },
  { id: 37, arabicName: "الصافات", englishName: "As-Saffat", ayahCount: 182 },
  { id: 38, arabicName: "ص", englishName: "Sad", ayahCount: 88 },
  { id: 39, arabicName: "الزمر", englishName: "Az-Zumar", ayahCount: 75 },
  { id: 40, arabicName: "غافر", englishName: "Ghafir", ayahCount: 85 },
  { id: 41, arabicName: "فصلت", englishName: "Fussilat", ayahCount: 54 },
  { id: 42, arabicName: "الشورى", englishName: "Ash-Shura", ayahCount: 53 },
  { id: 43, arabicName: "الزخرف", englishName: "Az-Zukhruf", ayahCount: 89 },
  { id: 44, arabicName: "الدخان", englishName: "Ad-Dukhan", ayahCount: 59 },
  { id: 45, arabicName: "الجاثية", englishName: "Al-Jathiyah", ayahCount: 37 },
  { id: 46, arabicName: "الأحقاف", englishName: "Al-Ahqaf", ayahCount: 35 },
  { id: 47, arabicName: "محمد", englishName: "Muhammad", ayahCount: 38 },
  { id: 48, arabicName: "الفتح", englishName: "Al-Fath", ayahCount: 29 },
  { id: 49, arabicName: "الحجرات", englishName: "Al-Hujurat", ayahCount: 18 },
  { id: 50, arabicName: "ق", englishName: "Qaf", ayahCount: 45 },
  {
    id: 51,
    arabicName: "الذاريات",
    englishName: "Adh-Dhariyat",
    ayahCount: 60,
  },
  { id: 52, arabicName: "الطور", englishName: "At-Tur", ayahCount: 49 },
  { id: 53, arabicName: "النجم", englishName: "An-Najm", ayahCount: 62 },
  { id: 54, arabicName: "القمر", englishName: "Al-Qamar", ayahCount: 55 },
  { id: 55, arabicName: "الرحمن", englishName: "Ar-Rahman", ayahCount: 78 },
  { id: 56, arabicName: "الواقعة", englishName: "Al-Waqi'ah", ayahCount: 96 },
  { id: 57, arabicName: "الحديد", englishName: "Al-Hadid", ayahCount: 29 },
  { id: 58, arabicName: "المجادلة", englishName: "Al-Mujadila", ayahCount: 22 },
  { id: 59, arabicName: "الحشر", englishName: "Al-Hashr", ayahCount: 24 },
  {
    id: 60,
    arabicName: "الممتحنة",
    englishName: "Al-Mumtahanah",
    ayahCount: 13,
  },
  { id: 61, arabicName: "الصف", englishName: "As-Saf", ayahCount: 14 },
  { id: 62, arabicName: "الجمعة", englishName: "Al-Jumu'ah", ayahCount: 11 },
  {
    id: 63,
    arabicName: "المنافقون",
    englishName: "Al-Munafiqun",
    ayahCount: 11,
  },
  { id: 64, arabicName: "التغابن", englishName: "At-Taghabun", ayahCount: 18 },
  { id: 65, arabicName: "الطلاق", englishName: "At-Talaq", ayahCount: 12 },
  { id: 66, arabicName: "التحريم", englishName: "At-Tahrim", ayahCount: 12 },
  { id: 67, arabicName: "الملك", englishName: "Al-Mulk", ayahCount: 30 },
  { id: 68, arabicName: "القلم", englishName: "Al-Qalam", ayahCount: 52 },
  { id: 69, arabicName: "الحاقة", englishName: "Al-Haqqah", ayahCount: 52 },
  { id: 70, arabicName: "المعارج", englishName: "Al-Ma'arij", ayahCount: 44 },
  { id: 71, arabicName: "نوح", englishName: "Nuh", ayahCount: 28 },
  { id: 72, arabicName: "الجن", englishName: "Al-Jinn", ayahCount: 28 },
  { id: 73, arabicName: "المزمل", englishName: "Al-Muzzammil", ayahCount: 20 },
  {
    id: 74,
    arabicName: "المدثر",
    englishName: "Al-Muddaththir",
    ayahCount: 56,
  },
  { id: 75, arabicName: "القيامة", englishName: "Al-Qiyamah", ayahCount: 40 },
  { id: 76, arabicName: "الإنسان", englishName: "Al-Insan", ayahCount: 31 },
  { id: 77, arabicName: "المرسلات", englishName: "Al-Mursalat", ayahCount: 50 },
  { id: 78, arabicName: "النبأ", englishName: "An-Naba", ayahCount: 40 },
  { id: 79, arabicName: "النازعات", englishName: "An-Nazi'at", ayahCount: 46 },
  { id: 80, arabicName: "عبس", englishName: "Abasa", ayahCount: 42 },
  { id: 81, arabicName: "التكوير", englishName: "At-Takwir", ayahCount: 29 },
  { id: 82, arabicName: "الانفطار", englishName: "Al-Infitar", ayahCount: 19 },
  {
    id: 83,
    arabicName: "المطففين",
    englishName: "Al-Mutaffifin",
    ayahCount: 36,
  },
  { id: 84, arabicName: "الانشقاق", englishName: "Al-Inshiqaq", ayahCount: 25 },
  { id: 85, arabicName: "البروج", englishName: "Al-Buruj", ayahCount: 22 },
  { id: 86, arabicName: "الطارق", englishName: "At-Tariq", ayahCount: 17 },
  { id: 87, arabicName: "الأعلى", englishName: "Al-A'la", ayahCount: 19 },
  { id: 88, arabicName: "الغاشية", englishName: "Al-Ghashiyah", ayahCount: 26 },
  { id: 89, arabicName: "الفجر", englishName: "Al-Fajr", ayahCount: 30 },
  { id: 90, arabicName: "البلد", englishName: "Al-Balad", ayahCount: 20 },
  { id: 91, arabicName: "الشمس", englishName: "Ash-Shams", ayahCount: 15 },
  { id: 92, arabicName: "الليل", englishName: "Al-Layl", ayahCount: 21 },
  { id: 93, arabicName: "الضحى", englishName: "Ad-Duha", ayahCount: 11 },
  { id: 94, arabicName: "الشرح", englishName: "Ash-Sharh", ayahCount: 8 },
  { id: 95, arabicName: "التين", englishName: "At-Tin", ayahCount: 8 },
  { id: 96, arabicName: "العلق", englishName: "Al-Alaq", ayahCount: 19 },
  { id: 97, arabicName: "القدر", englishName: "Al-Qadr", ayahCount: 5 },
  { id: 98, arabicName: "البينة", englishName: "Al-Bayyinah", ayahCount: 8 },
  { id: 99, arabicName: "الزلزلة", englishName: "Az-Zalzalah", ayahCount: 8 },
  { id: 100, arabicName: "العاديات", englishName: "Al-Adiyat", ayahCount: 11 },
  { id: 101, arabicName: "القارعة", englishName: "Al-Qari'ah", ayahCount: 11 },
  { id: 102, arabicName: "التكاثر", englishName: "At-Takathur", ayahCount: 8 },
  { id: 103, arabicName: "العصر", englishName: "Al-Asr", ayahCount: 3 },
  { id: 104, arabicName: "الهمزة", englishName: "Al-Humazah", ayahCount: 9 },
  { id: 105, arabicName: "الفيل", englishName: "Al-Fil", ayahCount: 5 },
  { id: 106, arabicName: "قريش", englishName: "Quraysh", ayahCount: 4 },
  { id: 107, arabicName: "الماعون", englishName: "Al-Ma'un", ayahCount: 7 },
  { id: 108, arabicName: "الكوثر", englishName: "Al-Kawthar", ayahCount: 3 },
  { id: 109, arabicName: "الكافرون", englishName: "Al-Kafirun", ayahCount: 6 },
  { id: 110, arabicName: "النصر", englishName: "An-Nasr", ayahCount: 3 },
  { id: 111, arabicName: "المسد", englishName: "Al-Masad", ayahCount: 5 },
  { id: 112, arabicName: "الإخلاص", englishName: "Al-Ikhlas", ayahCount: 4 },
  { id: 113, arabicName: "الفلق", englishName: "Al-Falaq", ayahCount: 5 },
  { id: 114, arabicName: "الناس", englishName: "An-Nas", ayahCount: 6 },
];

async function main() {
  console.log("🌱 Starting seed...");

  // ---------------------------------------------------------------------------
  // 1. Seed all 114 Surahs
  // ---------------------------------------------------------------------------
  console.log("📖 Seeding surahs...");

  await prisma.surah.createMany({
    data: SURAHS,
    skipDuplicates: true,
  });

  console.log(`✅ ${SURAHS.length} surahs seeded.`);

  // ---------------------------------------------------------------------------
  // 2. Seed Admin user
  // ---------------------------------------------------------------------------
  console.log("👤 Seeding admin user...");

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@samaa.app";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@Samaa2026!";

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      displayName: "Samaa Admin",
      role: "ADMIN",
      isEmailVerified: true,
    },
  });

  console.log(`✅ Admin user seeded: ${ADMIN_EMAIL}`);
  console.log("🏁 Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
