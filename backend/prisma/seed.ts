import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import {
  AssignmentStatus,
  AuditAction,
  CoachPlanRequirement,
  CoachRequestType,
  CoachSubscriptionAction,
  FileVisibility,
  Gender,
  MembershipAuditAction,
  NotificationType,
  ObserverStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  ProgressPhotoType,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

import { hashPassword, hashSecurityAnswer } from '../src/common/utils/hash.util';
import { dateOfBirthFromAge } from '../src/common/utils/age.util';

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://progym:progym@localhost:5432/progym?schema=public',
});
const prisma = new PrismaClient({ adapter });

const dayMs = 86_400_000;
const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'Demo@123456';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';
const seedDemoData = process.env.SEED_DEMO_DATA !== 'false';
const uploadRoot = join(process.cwd(), 'uploads');
const observerAccounts = [
  {
    fullName: 'مراقب الفترة الأولى',
    fallbackPasswordHash:
      '$argon2id$v=19$m=65536,t=3,p=4$IIj8qM/5Oyd/s7ZpTzBiqg$ARjiKKtrVaqAmSbds5vInef7NnqxyU4WsxPbIwROk8M',
    legacyName: 'Morning Shift Observer',
    notes: 'الوردية الأولى: من 7 صباحاً حتى 2 ظهراً',
    password: process.env.SEED_OBSERVER_1_PASSWORD,
    phone: '+963900000301',
    shiftEnd: '14:00',
    shiftStart: '07:00',
    username: process.env.SEED_OBSERVER_1_USERNAME ?? 'observer.1',
  },
  {
    fullName: 'مراقب الفترة الثانية',
    fallbackPasswordHash:
      '$argon2id$v=19$m=65536,t=3,p=4$AQEcu6n3faND9toTeSHnNg$fcnPbsdCc6X9qeSXl1Nv+36IECVtSfedORUqxKvwPEQ',
    legacyName: 'Evening Shift Observer',
    notes: 'الوردية الثانية: من 2 ظهراً حتى 7 مساءً',
    password: process.env.SEED_OBSERVER_2_PASSWORD,
    phone: '+963900000302',
    shiftEnd: '19:00',
    shiftStart: '14:00',
    username: process.env.SEED_OBSERVER_2_USERNAME ?? 'observer.2',
  },
  {
    fullName: 'مراقب الفترة الثالثة',
    fallbackPasswordHash:
      '$argon2id$v=19$m=65536,t=3,p=4$PH1l+ZMlnCDR0q2exhUhQQ$HQPoxcKRgdbcwlEwobLAJyGGAHIjUAr4TC1G50yp1nA',
    legacyName: 'Weekend Shift Observer',
    notes: 'الوردية الثالثة: من 7 مساءً حتى 12 ليلاً',
    password: process.env.SEED_OBSERVER_3_PASSWORD,
    phone: '+963900000303',
    shiftEnd: '00:00',
    shiftStart: '19:00',
    username: process.env.SEED_OBSERVER_3_USERNAME ?? 'observer.3',
  },
] as const;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * dayMs);
}

function daysAgo(days: number, hour = 9) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days, hour));
}

function utcDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function money(value: number) {
  return Math.round(value);
}

async function writeSeedSvg(storageKey: string, title: string, subtitle: string, accent: string) {
  const absolutePath = join(uploadRoot, storageKey);
  const folder = dirname(absolutePath);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#eef6e9"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="960" height="960" rx="80" fill="url(#g)"/>
  <rect x="58" y="58" width="844" height="844" rx="62" fill="none" stroke="#071006" stroke-opacity=".16" stroke-width="8"/>
  <circle cx="742" cy="210" r="118" fill="#22ff00" opacity=".55"/>
  <path d="M168 650h624v44H168zm96-118h432v38H264zm76-118h278v34H340z" fill="#071006" opacity=".88"/>
  <text x="86" y="180" fill="#071006" font-family="Arial, sans-serif" font-size="76" font-weight="900">${title}</text>
  <text x="88" y="258" fill="#31402f" font-family="Arial, sans-serif" font-size="32" font-weight="700">${subtitle}</text>
</svg>`;

  await mkdir(folder, { recursive: true });
  await writeFile(absolutePath, svg, 'utf8');

  return Buffer.byteLength(svg);
}

async function upsertSeedFile(input: {
  accent: string;
  ownerUserId: string;
  storageKey: string;
  subtitle: string;
  title: string;
  visibility?: FileVisibility;
}) {
  const byteSize = await writeSeedSvg(input.storageKey, input.title, input.subtitle, input.accent);
  const originalName = input.storageKey.split('/').pop() ?? 'seed.svg';

  return prisma.fileAsset.upsert({
    create: {
      byteSize,
      mimeType: 'image/svg+xml',
      originalName,
      ownerUserId: input.ownerUserId,
      storageKey: input.storageKey,
      visibility: input.visibility ?? FileVisibility.PRIVATE,
    },
    update: {
      byteSize,
      mimeType: 'image/svg+xml',
      ownerUserId: input.ownerUserId,
      visibility: input.visibility ?? FileVisibility.PRIVATE,
    },
    where: { storageKey: input.storageKey },
  });
}

const demoMembers = [
  {
    age: 28,
    code: 'PG-OMAR',
    goal: 'بناء كتلة عضلية',
    height: 178,
    name: 'عمر الخطيب',
    phone: '+963900000101',
    role: UserRole.COACH,
    username: 'coach.omar',
    weight: 84,
  },
  {
    age: 32,
    code: 'PG-KARIM',
    goal: 'تنشيف وتحسين اللياقة',
    height: 181,
    name: 'كريم مراد',
    phone: '+963900000102',
    role: UserRole.COACH,
    username: 'coach.karim',
    weight: 88,
  },
  {
    age: 24,
    code: 'PG-AHMAD',
    goal: 'زيادة القوة',
    height: 176,
    name: 'أحمد ناصر',
    phone: '+963900000201',
    role: UserRole.MEMBER,
    username: 'ahmad',
    weight: 78,
  },
  {
    age: 27,
    code: 'PG-MOHAMMAD',
    goal: 'خسارة دهون',
    height: 172,
    name: 'محمد سليمان',
    phone: '+963900000202',
    role: UserRole.MEMBER,
    username: 'mohammad',
    weight: 91,
  },
  {
    age: 21,
    code: 'PG-SAMI',
    goal: 'تحسين الأداء الرياضي',
    height: 184,
    name: 'سامي الحسن',
    phone: '+963900000203',
    role: UserRole.MEMBER,
    username: 'sami',
    weight: 82,
  },
  {
    age: 35,
    code: 'PG-HADI',
    goal: 'استعادة اللياقة',
    height: 175,
    name: 'هادي عابد',
    phone: '+963900000204',
    role: UserRole.MEMBER,
    username: 'hadi',
    weight: 96,
  },
  {
    age: 29,
    code: 'PG-YAZAN',
    goal: 'تضخيم نظيف',
    height: 179,
    name: 'يزن ديب',
    phone: '+963900000205',
    role: UserRole.MEMBER,
    username: 'yazan',
    weight: 80,
  },
  {
    age: 38,
    code: 'PG-FIRAS',
    goal: 'التزام وصحة عامة',
    height: 171,
    name: 'فراس شاهين',
    phone: '+963900000206',
    role: UserRole.MEMBER,
    username: 'firas',
    weight: 89,
  },
] as const;

async function seedBaseData() {
  await prisma.gymSettings.upsert({
    create: {
      addressAr: 'الإنشاءات مقابل الفرن الآلي',
      addressEn: 'Al-Inshaat, opposite the automatic bakery',
      descriptionAr: 'منصة Pro Gym الذكية لإدارة التسجيل والحضور والاشتراكات والتدريب الخاص.',
      descriptionEn:
        'The Pro Gym smart platform for registration, attendance, memberships, and private coaching.',
      email: null,
      latitude: 34.7179977,
      logoUrl: '/images/gym/log_bw.jpeg',
      longitude: 36.6970795,
      openingHours: {
        friday: { closes: '19:00', opens: '14:00' },
        saturdayThroughThursday: { closes: '12:00', opens: '07:00' },
      },
      nameAr: 'برو جيم',
      nameEn: 'Pro Gym',
      phone: '2213324',
      singletonKey: 'primary',
      socialLinks: { instagram: 'https://www.instagram.com/progym.homs/' },
    },
    update: {
      addressAr: 'الإنشاءات مقابل الفرن الآلي',
      addressEn: 'Al-Inshaat, opposite the automatic bakery',
      descriptionAr: 'منصة Pro Gym الذكية لإدارة التسجيل والحضور والاشتراكات والتدريب الخاص.',
      descriptionEn:
        'The Pro Gym smart platform for registration, attendance, memberships, and private coaching.',
      email: null,
      latitude: 34.7179977,
      logoUrl: '/images/gym/log_bw.jpeg',
      longitude: 36.6970795,
      openingHours: {
        friday: { closes: '19:00', opens: '14:00' },
        saturdayThroughThursday: { closes: '12:00', opens: '07:00' },
      },
      nameAr: 'برو جيم',
      nameEn: 'Pro Gym',
      phone: '2213324',
      socialLinks: { instagram: 'https://www.instagram.com/progym.homs/' },
    },
    where: { singletonKey: 'primary' },
  });

  const admin = await prisma.user.upsert({
    create: {
      fullName: 'Pro Gym Admin',
      passwordHash: await hashPassword(adminPassword),
      phone: '+963000000000',
      role: UserRole.ADMIN,
      username: process.env.SEED_ADMIN_USERNAME ?? 'admin',
    },
    update: {
      fullName: 'Pro Gym Admin',
      passwordHash: await hashPassword(adminPassword),
      status: UserStatus.ACTIVE,
    },
    where: { username: process.env.SEED_ADMIN_USERNAME ?? 'admin' },
  });

  const categories = [
    ['chest', 'صدر', 'Chest'],
    ['back', 'ظهر', 'Back'],
    ['shoulders', 'أكتاف', 'Shoulders'],
    ['arms', 'ذراعين', 'Arms'],
    ['core', 'عضلات الوسط', 'Core'],
    ['legs', 'أرجل', 'Legs'],
    ['cardio', 'كارديو', 'Cardio'],
  ] as const;

  for (const [slug, nameAr, nameEn] of categories) {
    await prisma.exerciseCategory.upsert({
      create: { nameAr, nameEn, slug },
      update: { nameAr, nameEn },
      where: { slug },
    });
  }

  const plans = [
    ['30 يوم', '30 Days', 30, 500_000, 1],
    ['60 يوم', '60 Days', 60, 900_000, 2],
    ['90 يوم', '90 Days', 90, 1_250_000, 3],
    ['365 يوم', '365 Days', 365, 4_500_000, 4],
  ] as const;

  for (const [nameAr, nameEn, durationDays, priceMinor, sortOrder] of plans) {
    const existing = await prisma.membershipPlan.findFirst({ where: { durationDays, nameAr } });
    if (existing) {
      await prisma.membershipPlan.update({
        data: { nameEn, priceMinor, sortOrder },
        where: { id: existing.id },
      });
    } else {
      await prisma.membershipPlan.create({
        data: {
          durationDays,
          nameAr,
          nameEn,
          priceMinor,
          sortOrder,
        },
      });
    }
  }

  const exerciseRows = [
    [
      'chest',
      'بنش برس',
      'Bench Press',
      'تمرين أساسي لبناء قوة الصدر.',
      'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    ],
    [
      'chest',
      'دمبل فلاي',
      'Dumbbell Fly',
      'افتح الصدر بتحكم وحافظ على الكتف ثابت.',
      'https://www.youtube.com/watch?v=eozdVDA78K0',
    ],
    [
      'back',
      'سحب أمامي',
      'Lat Pulldown',
      'اسحب بالمرفقين وحافظ على الظهر مشدود.',
      'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    ],
    [
      'back',
      'باربل رو',
      'Barbell Row',
      'قوة ظهر وسحب أفقي بتركيز.',
      'https://www.youtube.com/watch?v=vT2GjY_Umpw',
    ],
    [
      'shoulders',
      'ضغط كتف',
      'Shoulder Press',
      'ادفع للأعلى بدون تقوس زائد في الظهر.',
      'https://www.youtube.com/watch?v=qEwKCR5JCog',
    ],
    [
      'arms',
      'بايسبس بار',
      'Barbell Curl',
      'تحكم كامل بدون تأرجح.',
      'https://www.youtube.com/watch?v=kwG2ipFRgfo',
    ],
    [
      'arms',
      'ترايسبس كيبل',
      'Cable Triceps Pushdown',
      'ثبّت المرفقين بجانب الجسم ومد الذراع بالكامل بتحكم.',
      'https://www.youtube.com/watch?v=2-LAMcpzODU',
    ],
    [
      'core',
      'بلانك',
      'Plank',
      'حافظ على استقامة الجسم وشد عضلات البطن طوال الجولة.',
      'https://www.youtube.com/watch?v=pSHjTRCQxIw',
    ],
    [
      'legs',
      'سكوات',
      'Squat',
      'حافظ على الركبة باتجاه القدم وانزل بتحكم.',
      'https://www.youtube.com/watch?v=aclHkVaku9U',
    ],
    [
      'cardio',
      'حبال المعركة',
      'Battle Ropes',
      'جولات قصيرة عالية الشدة.',
      'https://www.youtube.com/watch?v=r2Rzaf7SaG4',
    ],
  ] as const;
  const trainingDayByCategory: Record<string, number> = {
    arms: 2,
    back: 3,
    cardio: 5,
    chest: 2,
    core: 2,
    legs: 1,
    shoulders: 4,
  };

  for (const [slug, nameAr, nameEn, instructionsAr, videoUrl] of exerciseRows) {
    const category = await prisma.exerciseCategory.findUniqueOrThrow({ where: { slug } });
    const existing = await prisma.exercise.findFirst({
      where: { categoryId: category.id, nameAr },
    });
    const data = {
      categoryId: category.id,
      descriptionAr: instructionsAr,
      instructionsAr,
      isActive: true,
      nameAr,
      nameEn,
      trainingDay: trainingDayByCategory[slug],
      videoUrl,
    };

    if (existing) {
      await prisma.exercise.update({ data, where: { id: existing.id } });
    } else {
      await prisma.exercise.create({ data });
    }
  }

  return admin;
}

async function seedDemoUsers() {
  const passwordHash = await hashPassword(demoPassword);
  const securityAnswers = await Promise.all([
    hashSecurityAnswer('دمشق'),
    hashSecurityAnswer('رياضة'),
    hashSecurityAnswer('برو جيم'),
  ]);

  for (const member of demoMembers) {
    const user = await prisma.user.upsert({
      create: {
        fullName: member.name,
        passwordHash,
        phone: member.phone,
        role: member.role,
        status: UserStatus.ACTIVE,
        username: member.username,
        memberProfile: {
          create: {
            currentWeightKg: member.weight,
            dateOfBirth: dateOfBirthFromAge(member.age),
            fitnessGoal: member.goal,
            gender: Gender.MALE,
            heightCm: member.height,
            memberCode: member.code,
          },
        },
      },
      update: {
        fullName: member.name,
        passwordHash,
        phone: member.phone,
        role: member.role,
        status: UserStatus.ACTIVE,
        memberProfile: {
          upsert: {
            create: {
              currentWeightKg: member.weight,
              dateOfBirth: dateOfBirthFromAge(member.age),
              fitnessGoal: member.goal,
              gender: Gender.MALE,
              heightCm: member.height,
              memberCode: member.code,
            },
            update: {
              currentWeightKg: member.weight,
              dateOfBirth: dateOfBirthFromAge(member.age),
              fitnessGoal: member.goal,
              gender: Gender.MALE,
              heightCm: member.height,
            },
          },
        },
      },
      where: { username: member.username },
    });

    await prisma.securityAnswer.deleteMany({ where: { userId: user.id } });
    await prisma.securityAnswer.createMany({
      data: [
        {
          answerHash: securityAnswers[0] ?? '',
          questionKey: 'birth_city',
          questionText: 'في أي مدينة ولدت؟',
          userId: user.id,
        },
        {
          answerHash: securityAnswers[1] ?? '',
          questionKey: 'favorite_meal',
          questionText: 'ما وجبتك المفضلة؟',
          userId: user.id,
        },
        {
          answerHash: securityAnswers[2] ?? '',
          questionKey: 'favorite_teacher',
          questionText: 'ما اسم معلمك المفضل؟',
          userId: user.id,
        },
      ],
    });

    const avatar = await upsertSeedFile({
      accent: member.role === UserRole.COACH ? '#22ff00' : '#c8ffd0',
      ownerUserId: user.id,
      storageKey: `seed/avatars/${member.username}.svg`,
      subtitle: member.role === UserRole.COACH ? 'COACH' : 'MEMBER',
      title: member.name.split(' ')[0] ?? 'PG',
      visibility: FileVisibility.PRIVATE,
    });

    await prisma.user.update({
      data: { avatarUrl: `/api/v1/files/${avatar.id}` },
      where: { id: user.id },
    });
  }

  const coachProfiles = [
    {
      bioAr: 'مدرب قوة وتحول جسدي يركز على قياس النتائج والالتزام.',
      bioEn: 'Strength and transformation coach focused on measurable progress.',
      specialties: ['قوة', 'تضخيم', 'تحول جسدي'],
      username: 'coach.omar',
    },
    {
      bioAr: 'مدرب لياقة وتغذية يبني خططاً عملية قابلة للاستمرار.',
      bioEn: 'Fitness and nutrition coach building sustainable plans.',
      specialties: ['تغذية', 'تنشيف', 'لياقة'],
      username: 'coach.karim',
    },
  ];

  for (const coach of coachProfiles) {
    await prisma.user.update({
      data: {
        coachProfile: {
          upsert: {
            create: {
              bioAr: coach.bioAr,
              bioEn: coach.bioEn,
              isPublic: true,
              publicSlug: coach.username.replace('.', '-'),
              specialties: coach.specialties,
            },
            update: {
              bioAr: coach.bioAr,
              bioEn: coach.bioEn,
              isPublic: true,
              specialties: coach.specialties,
            },
          },
        },
        role: UserRole.COACH,
      },
      where: { username: coach.username },
    });
  }
}

async function seedObservers() {
  for (const account of observerAccounts) {
    const passwordHash = account.password
      ? await hashPassword(account.password)
      : account.fallbackPasswordHash;
    const user = await prisma.user.upsert({
      create: {
        fullName: account.fullName,
        passwordHash,
        phone: account.phone,
        role: UserRole.OBSERVER,
        status: UserStatus.ACTIVE,
        username: account.username,
      },
      update: {
        fullName: account.fullName,
        passwordHash,
        phone: account.phone,
        role: UserRole.OBSERVER,
        status: UserStatus.ACTIVE,
      },
      where: { username: account.username },
    });

    const existing = await prisma.shiftObserver.findFirst({
      where: {
        OR: [{ userId: user.id }, { fullName: account.fullName }, { fullName: account.legacyName }],
      },
    });

    const observerData = {
      fullName: account.fullName,
      notes: account.notes,
      phone: account.phone,
      shiftEnd: account.shiftEnd,
      shiftStart: account.shiftStart,
      status: ObserverStatus.ACTIVE,
      userId: user.id,
    };

    if (existing) {
      await prisma.shiftObserver.update({
        data: observerData,
        where: { id: existing.id },
      });
    } else {
      await prisma.shiftObserver.create({
        data: observerData,
      });
    }
  }
}

async function cleanupDemoData() {
  const users = await prisma.user.findMany({
    include: { coachProfile: true, memberProfile: true },
    where: { username: { in: demoMembers.map((member) => member.username) } },
  });
  const userIds = users.map((user) => user.id);
  const memberIds = users.flatMap((user) => (user.memberProfile ? [user.memberProfile.id] : []));
  const coachIds = users.flatMap((user) => (user.coachProfile ? [user.coachProfile.id] : []));

  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.coachRequest.deleteMany({
    where: { OR: [{ memberId: { in: memberIds } }, { coachId: { in: coachIds } }] },
  });
  await prisma.memberProfileChangeRequest.deleteMany({
    where: { memberId: { in: memberIds } },
  });
  await prisma.workoutPlan.deleteMany({
    where: { OR: [{ memberId: { in: memberIds } }, { coachId: { in: coachIds } }] },
  });
  await prisma.nutritionPlan.deleteMany({
    where: { OR: [{ memberId: { in: memberIds } }, { coachId: { in: coachIds } }] },
  });
  await prisma.progressPhoto.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.fileAsset.deleteMany({ where: { storageKey: { startsWith: 'seed/progress/' } } });
  await prisma.progressEntry.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.attendanceRecord.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.membershipAuditLog.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.subscription.deleteMany({ where: { memberId: { in: memberIds } } });
  await prisma.coachAssignment.deleteMany({
    where: { OR: [{ memberId: { in: memberIds } }, { coachId: { in: coachIds } }] },
  });
  await prisma.profileUpdateHistory.deleteMany({ where: { userId: { in: userIds } } });
}

async function seedOperationalData(adminId: string, adminName: string) {
  const users = await prisma.user.findMany({
    include: { coachProfile: true, memberProfile: true },
    where: { username: { in: demoMembers.map((member) => member.username) } },
  });
  const byUsername = new Map(users.map((user) => [user.username, user]));
  const plan30 = await prisma.membershipPlan.findFirstOrThrow({ where: { durationDays: 30 } });
  const plan90 = await prisma.membershipPlan.findFirstOrThrow({ where: { durationDays: 90 } });
  const plan365 = await prisma.membershipPlan.findFirstOrThrow({ where: { durationDays: 365 } });
  const exercises = await prisma.exercise.findMany({ take: 8 });
  const shiftObserver = await prisma.shiftObserver.findFirstOrThrow({
    orderBy: { createdAt: 'asc' },
    where: { status: ObserverStatus.ACTIVE },
  });

  const assignmentPairs = [
    ['ahmad', 'coach.omar', 'Private coaching: strength block'],
    ['mohammad', 'coach.omar', 'Private coaching: cutting block'],
    ['sami', 'coach.karim', 'Private coaching: performance block'],
    ['yazan', 'coach.karim', 'Private coaching: clean bulk'],
  ] as const;

  for (let index = 0; index < assignmentPairs.length; index += 1) {
    const [memberUsername, coachUsername, notes] = assignmentPairs[index];
    const member = byUsername.get(memberUsername)?.memberProfile;
    const coach = byUsername.get(coachUsername)?.coachProfile;
    if (!member || !coach) continue;

    const coachingEndsAt = addDays(new Date(), index === 0 ? 4 : 14 + index * 6);
    const assignment = await prisma.coachAssignment.create({
      data: {
        coachId: coach.id,
        coachingEndsAt,
        coachingStartsAt: daysAgo(26 - index),
        memberId: member.id,
        notes,
        planRequirement: CoachPlanRequirement.BOTH,
        reminderEnabled: true,
        startedAt: daysAgo(42),
        status: AssignmentStatus.ACTIVE,
      },
    });
    await prisma.coachSubscriptionEvent.createMany({
      data: [
        {
          action: CoachSubscriptionAction.ADDED,
          assignmentId: assignment.id,
          coachId: coach.id,
          createdAt: daysAgo(index === 0 ? 100 : 42),
          memberId: member.id,
        },
        ...(index === 0
          ? [
              {
                action: CoachSubscriptionAction.STARTED,
                assignmentId: assignment.id,
                coachId: coach.id,
                createdAt: daysAgo(90),
                days: 30,
                memberId: member.id,
                newEndsAt: daysAgo(60),
              },
              {
                action: CoachSubscriptionAction.EXPIRED,
                assignmentId: assignment.id,
                coachId: coach.id,
                createdAt: daysAgo(60),
                memberId: member.id,
                previousEndsAt: daysAgo(60),
              },
            ]
          : []),
        {
          action: CoachSubscriptionAction.STARTED,
          assignmentId: assignment.id,
          coachId: coach.id,
          createdAt: daysAgo(26 - index),
          days: 30,
          memberId: member.id,
          newEndsAt: coachingEndsAt,
        },
        ...(index === 0
          ? [
              {
                action: CoachSubscriptionAction.RENEWED,
                assignmentId: assignment.id,
                coachId: coach.id,
                createdAt: daysAgo(2),
                days: 7,
                memberId: member.id,
                newEndsAt: coachingEndsAt,
                previousEndsAt: addDays(coachingEndsAt, -7),
              },
            ]
          : []),
      ],
    });
  }

  for (let index = 0; index < demoMembers.length; index += 1) {
    const demo = demoMembers[index];
    const user = byUsername.get(demo.username);
    const member = user?.memberProfile;
    if (!user || !member) continue;

    const selectedPlan = index % 3 === 0 ? plan90 : index % 3 === 1 ? plan30 : plan365;
    const status =
      demo.username === 'hadi'
        ? SubscriptionStatus.EXPIRED
        : demo.username === 'firas'
          ? SubscriptionStatus.FROZEN
          : SubscriptionStatus.ACTIVE;
    const startsAt = daysAgo(status === SubscriptionStatus.EXPIRED ? 70 : 24);
    const endsAt =
      status === SubscriptionStatus.EXPIRED
        ? daysAgo(4)
        : status === SubscriptionStatus.FROZEN
          ? addDays(new Date(), 18)
          : addDays(new Date(), selectedPlan.durationDays - 12 - index);

    const subscription = await prisma.subscription.create({
      data: {
        endsAt,
        frozenAt: status === SubscriptionStatus.FROZEN ? daysAgo(2) : null,
        memberId: member.id,
        planId: selectedPlan.id,
        startsAt,
        status,
      },
    });

    await prisma.payment.create({
      data: {
        amountMinor: money(selectedPlan.priceMinor),
        method: PaymentMethod.CASH,
        paidAt: startsAt,
        receivedById: adminId,
        status: PaymentStatus.PAID,
        subscriptionId: subscription.id,
      },
    });

    await prisma.membershipAuditLog.create({
      data: {
        action: MembershipAuditAction.CREATE,
        adminId,
        adminName,
        memberId: member.id,
        newValue: {
          endsAt: endsAt.toISOString(),
          planId: selectedPlan.id,
          startsAt: startsAt.toISOString(),
          status,
        },
        observerId: shiftObserver.id,
        observerName: shiftObserver.fullName,
        previousValue: {},
        reason: 'Seed demo membership for local testing',
        subscriptionId: subscription.id,
      },
    });

    if (demo.username === 'ahmad') {
      const extended = addDays(endsAt, 10);
      await prisma.membershipAuditLog.create({
        data: {
          action: MembershipAuditAction.ADD_DAYS,
          adminId,
          adminName,
          memberId: member.id,
          newValue: { endsAt: extended.toISOString(), status },
          observerId: shiftObserver.id,
          observerName: shiftObserver.fullName,
          previousValue: { endsAt: endsAt.toISOString(), status },
          reason: 'Loyal member bonus days',
          subscriptionId: subscription.id,
        },
      });
    }

    const attendanceRows = Array.from({ length: 18 })
      .map((_, dayIndex) => {
        const day = dayIndex * 2 + (index % 2);
        if (status === SubscriptionStatus.EXPIRED && day < 8) return null;
        const checkedInAt = daysAgo(day, 8 + ((index + dayIndex) % 10));
        return {
          attendanceDate: utcDateOnly(checkedInAt),
          checkedInAt,
          memberId: member.id,
          source: 'QR' as const,
        };
      })
      .filter(Boolean) as Array<{
      attendanceDate: Date;
      checkedInAt: Date;
      memberId: string;
      source: 'QR';
    }>;

    if (attendanceRows.length) {
      await prisma.attendanceRecord.createMany({ data: attendanceRows });
    }

    const progressEntryIds: string[] = [];
    for (let step = 0; step < 5; step += 1) {
      const measuredAt = daysAgo(56 - step * 14, 10);
      const weightShift =
        demo.goal.includes('خسارة') || demo.goal.includes('تنشيف') ? -step * 1.2 : step * 0.8;
      const progressEntry = await prisma.progressEntry.create({
        data: {
          armsCm: 34 + index * 0.4 + step * 0.2,
          chestCm: 98 + index * 0.6 + step * 0.6,
          measuredAt,
          memberId: member.id,
          notes: step === 0 ? 'Baseline measurement' : 'Coach follow-up measurement',
          waistCm: 92 + index * 0.5 - step * 0.7,
          weightKg: Math.max(55, demo.weight + weightShift),
        },
      });
      progressEntryIds.push(progressEntry.id);
    }

    if (['ahmad', 'mohammad', 'sami', 'yazan'].includes(demo.username)) {
      const photoTypes = [ProgressPhotoType.FRONT, ProgressPhotoType.SIDE, ProgressPhotoType.BACK];
      for (let photoIndex = 0; photoIndex < photoTypes.length; photoIndex += 1) {
        const type = photoTypes[photoIndex];
        const weekOneAsset = await upsertSeedFile({
          accent: '#d9ffe0',
          ownerUserId: user.id,
          storageKey: `seed/progress/${demo.username}-week1-${type.toLowerCase()}.svg`,
          subtitle: `${type} WEEK 1`,
          title: demo.name.split(' ')[0] ?? 'PG',
        });
        const weekEightAsset = await upsertSeedFile({
          accent: '#22ff00',
          ownerUserId: user.id,
          storageKey: `seed/progress/${demo.username}-week8-${type.toLowerCase()}.svg`,
          subtitle: `${type} WEEK 8`,
          title: demo.name.split(' ')[0] ?? 'PG',
        });

        await prisma.progressPhoto.createMany({
          data: [
            {
              capturedAt: daysAgo(56, 12 + photoIndex),
              fileAssetId: weekOneAsset.id,
              memberId: member.id,
              progressEntryId: progressEntryIds[0],
              type,
            },
            {
              capturedAt: daysAgo(4, 12 + photoIndex),
              fileAssetId: weekEightAsset.id,
              memberId: member.id,
              progressEntryId: progressEntryIds[progressEntryIds.length - 1],
              type,
            },
          ],
        });
      }
    }
  }

  for (const [memberUsername, coachUsername] of assignmentPairs) {
    const member = byUsername.get(memberUsername)?.memberProfile;
    const coach = byUsername.get(coachUsername)?.coachProfile;
    if (!member || !coach) continue;

    const workout = await prisma.workoutPlan.create({
      data: {
        coachId: coach.id,
        memberId: member.id,
        notes: 'خطة تجريبية مبنية على هدف العضو وحضوره.',
        seriesId: `seed-workout-${member.id}`,
        startsAt: daysAgo(14),
        status: 'ACTIVE',
        title: 'خطة قوة وتحول - 4 أيام',
      },
    });

    const planExercises = exercises.slice(0, 5);
    for (let index = 0; index < planExercises.length; index += 1) {
      const exercise = planExercises[index];
      await prisma.workoutPlanItem.create({
        data: {
          dayIndex: index % 4,
          dayTitle: ['صدر وترايسبس', 'ظهر وبايسبس', 'أرجل', 'أكتاف وكور'][index % 4],
          exerciseId: exercise.id,
          notes: index === 0 ? 'ابدأ بإحماء جيد ثم ارفع تدريجياً.' : 'حافظ على التقنية قبل الوزن.',
          planId: workout.id,
          reps: index % 2 === 0 ? '8-10' : '12-15',
          restSeconds: 90,
          sets: index % 2 === 0 ? 4 : 3,
          sortOrder: index,
          videoUrl: index === 0 ? 'https://www.youtube.com/watch?v=IODxDxX7oi4' : undefined,
        },
      });
    }

    await prisma.nutritionPlan.create({
      data: {
        coachId: coach.id,
        memberId: member.id,
        notes: 'خطة غذائية تجريبية قابلة للتعديل حسب الوزن الأسبوعي.',
        seriesId: `seed-nutrition-${member.id}`,
        startsAt: daysAgo(14),
        status: 'ACTIVE',
        targetCalories: 2450,
        targetCarbsG: 285,
        targetFatG: 70,
        targetMode: 'MAINTAIN',
        targetProteinG: 170,
        title: 'خطة تغذية متابعة',
        meals: {
          create: [
            {
              name: 'الفطور',
              sortOrder: 1,
              timing: '08:00 صباحاً',
              items: {
                create: [
                  { calories: 360, name: 'بيض وشوفان', proteinG: 32, carbsG: 38, fatG: 10 },
                  { calories: 120, name: 'قهوة وحليب', proteinG: 8, carbsG: 10, fatG: 4 },
                ],
              },
            },
            {
              name: 'الغداء',
              sortOrder: 2,
              timing: '02:30 ظهراً',
              items: {
                create: [
                  { calories: 520, name: 'دجاج ورز', proteinG: 48, carbsG: 62, fatG: 8 },
                  { calories: 90, name: 'سلطة', proteinG: 3, carbsG: 12, fatG: 3 },
                ],
              },
            },
            {
              name: 'بعد التمرين',
              sortOrder: 3,
              timing: 'خلال 30 دقيقة بعد التمرين',
              items: {
                create: [{ calories: 260, name: 'زبادي وموز', proteinG: 22, carbsG: 34, fatG: 4 }],
              },
            },
          ],
        },
      },
    });

    await prisma.coachRequest.create({
      data: {
        coachId: coach.id,
        dueAt: addDays(new Date(), 3),
        memberId: member.id,
        message: 'ارفع صور تقدم أمامية وجانبية وخلفية قبل نهاية الأسبوع.',
        status: 'PENDING',
        type: CoachRequestType.NEW_PHOTOS,
      },
    });
  }

  const coachWithPendingChange = byUsername.get('coach.karim')?.coachProfile;
  if (coachWithPendingChange) {
    await prisma.coachProfileChangeRequest.create({
      data: {
        coachId: coachWithPendingChange.id,
        requestedData: {
          bioAr: 'مدرب لياقة وقوة يركز على بناء العادات والتقدم القابل للقياس.',
          phone: '0999002202',
        },
      },
    });
  }

  for (const user of users) {
    await prisma.notification.createMany({
      data: [
        {
          actionUrl: '/ar/dashboard/member',
          bodyAr: 'مرحباً بك في تجربة Pro Gym الذكية. راقب اشتراكك وحضورك وخططك من لوحة واحدة.',
          titleAr: 'أهلاً بك في Pro Gym',
          type: NotificationType.SYSTEM,
          userId: user.id,
        },
        {
          actionUrl: '/ar/dashboard/member/attendance',
          bodyAr: 'تم تجهيز سجل حضور تجريبي لتستطيع معاينة الإحصائيات والاتجاهات.',
          titleAr: 'سجل الحضور جاهز',
          type: NotificationType.ATTENDANCE,
          userId: user.id,
        },
      ],
    });
  }

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      actorId: adminId,
      entityType: 'SeedData',
      metadata: {
        demoUsers: demoMembers.length,
        message: 'Seeded realistic Pro Gym demo data',
      },
    },
  });
}

async function main() {
  const admin = await seedBaseData();
  await seedObservers();
  if (seedDemoData) {
    await seedDemoUsers();
    await cleanupDemoData();
    await seedOperationalData(admin.id, admin.fullName);
  }

  console.log('Seed complete.');
  console.log(`Admin username: ${admin.username}`);
  console.log(`Admin password: ${adminPassword}`);
  console.log(
    `Observer usernames: ${observerAccounts.map((account) => account.username).join(', ')}`,
  );
  if (seedDemoData) {
    console.log(`Demo member password: ${demoPassword}`);
    console.log('Demo users: coach.omar, coach.karim, ahmad, mohammad, sami, hadi, yazan, firas');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
