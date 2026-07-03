import type { PublicLocale } from '@progym/shared';

export type PublicPageKey = 'home' | 'about' | 'coaches' | 'membership' | 'contact';

export type PublicImage = {
  alt: Record<PublicLocale, string>;
  src: string;
};

export const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const publicRoutes: Array<{ key: PublicPageKey; path: string }> = [
  { key: 'home', path: '' },
  { key: 'about', path: '/about' },
  { key: 'coaches', path: '/coaches' },
  { key: 'membership', path: '/membership' },
  { key: 'contact', path: '/contact' },
];

export function resolvePublicLocale(locale: string | null | undefined): PublicLocale {
  return locale === 'en' ? 'en' : 'ar';
}

function localizedRecord<T extends Record<PublicLocale, string>>(record: T): T {
  return new Proxy(record, {
    get(target, property) {
      if (property === 'ar' || property === 'en') return target[property];
      return target.ar;
    },
  }) as T;
}

export const brand = {
  accent: '#22ff00',
  address: localizedRecord({
    ar: 'حمص، سوريا',
    en: 'Homs, Syria',
  }),
  email: 'hello@progym.local',
  logoBw: '/images/pro-gym-logo-bw.jpeg',
  logoColor: '/images/pro-gym-logo-color.jpeg',
  name: 'Pro Gym',
  phone: '+963 000 000 000',
  social: [
    { href: 'https://www.instagram.com/', label: 'Instagram' },
    { href: 'https://www.facebook.com/', label: 'Facebook' },
    { href: 'https://www.youtube.com/', label: 'YouTube' },
  ],
};

export const publicImages = {
  coachFocus: {
    alt: localizedRecord({
      ar: 'مدرب يساعد عضوا في تمرين القوة',
      en: 'Coach guiding a member through strength training',
    }),
    src: '/images/gym/optimized/gym-07.webp',
  },
  community: {
    alt: {
      ar: 'مجموعة تتمرن داخل نادي حديث',
      en: 'Group training inside a modern gym',
    },
    src: '/images/gym/optimized/gym-06.webp',
  },
  equipment: {
    alt: {
      ar: 'أوزان ومعدات تدريب احترافية',
      en: 'Professional weights and training equipment',
    },
    src: '/images/gym/optimized/gym-09.webp',
  },
  facility: {
    alt: {
      ar: 'صالة تدريب واسعة بتجهيزات قوة',
      en: 'Spacious strength training floor',
    },
    src: '/images/gym/optimized/gym-03.webp',
  },
  hero: {
    alt: {
      ar: 'رياضي يستعد لرفع البار داخل صالة تدريب احترافية',
      en: 'Athlete preparing to lift a barbell in a professional gym',
    },
    src: '/images/gym/optimized/gym-01.webp',
  },
  membership: {
    alt: {
      ar: 'رياضي يتدرب بالحبال داخل النادي',
      en: 'Athlete training with battle ropes',
    },
    src: '/images/gym/optimized/gym-04.webp',
  },
  transformation: {
    alt: localizedRecord({
      ar: 'رياضي يرفع الأوزان ضمن برنامج تطوير القوة',
      en: 'Athlete lifting weights during a strength program',
    }),
    src: '/images/gym/optimized/gym-08.webp',
  },
} satisfies Record<string, PublicImage>;

const publicCopyBase = {
  ar: {
    about: {
      eyebrow: 'عن Pro Gym',
      facilityTitle: 'مساحة مصممة للتركيز',
      highlights: [
        'مناطق قوة وكارديو منظمة لتقليل الازدحام.',
        'بيئة نظيفة وحادة تساعدك على الالتزام.',
        'فريق تدريب يتابع التقدم بالأرقام والصور والخطط.',
      ],
      mission:
        'مهمتنا أن نجعل التدريب واضحا وقابلا للقياس. كل عضو يعرف أين يقف، ما خطته، وكيف يتقدم.',
      story:
        'Pro Gym ليس مجرد مكان للأجهزة. هو نظام تدريب كامل يجمع بين الانضباط، المتابعة الذكية، والمدربين القادرين على تحويل الهدف إلى عادة يومية.',
      title: 'نادي مبني للناس الذين يريدون نتيجة حقيقية.',
      values: ['انضباط', 'ثقة', 'تقدم', 'احتراف'],
      vision:
        'رؤيتنا أن يكون Pro Gym معيارا جديدا لتجربة النادي الحديثة: تدريب قوي، بيانات واضحة، وخدمة يشعر بها العضو من أول زيارة.',
    },
    coaches: {
      cta: 'تحدث معنا لاختيار المدرب الأنسب لهدفك.',
      eyebrow: 'فريق التدريب',
      intro:
        'مدربون متخصصون في القوة، التحول الجسدي، التغذية، والمتابعة اليومية. كل برنامج يبنى حول جسمك ووقتك وهدفك.',
      title: 'خبرة عملية. متابعة حقيقية. نتائج يمكن قياسها.',
    },
    contact: {
      address: 'العنوان',
      cta: 'أرسل طلبك وسيتواصل معك فريق Pro Gym.',
      email: 'البريد الإلكتروني',
      eyebrow: 'تواصل معنا',
      form: {
        goal: 'هدفك',
        message: 'رسالتك',
        name: 'الاسم الكامل',
        phone: 'رقم الهاتف',
        submit: 'إرسال الطلب',
        success: 'تم استلام طلبك. سنعود إليك قريبا.',
      },
      map: 'مكان الخريطة',
      phone: 'الهاتف',
      title: 'ابدأ التحول من محادثة واحدة.',
    },
    footer: {
      body: 'تجربة تدريب حديثة تجمع بين القوة، المتابعة، والهوية البصرية الجريئة.',
      quick: 'روابط سريعة',
      rights: 'جميع الحقوق محفوظة.',
    },
    home: {
      benefits: {
        eyebrow: 'العضوية',
        items: [
          'دخول منظم ومتابعة اشتراك يومية.',
          'خطط تدريب وتغذية قابلة للتطوير.',
          'طلبات متابعة وصور تقدم للمدربين.',
          'إشعارات داخلية لكل خطوة مهمة.',
        ],
        title: 'عضوية تشعر أنها مصممة لك، لا مجرد بطاقة دخول.',
      },
      coaches: {
        eyebrow: 'المدربون',
        title: 'المدرب المناسب يحول الهدف إلى نظام.',
      },
      community: {
        body: 'أجواء حادة، ناس ملتزمة، وفريق يعرف أسماء الأعضاء ونتائجهم. Pro Gym يبني شعور الانتماء من دون ضجيج.',
        title: 'مجتمع يرفع المستوى.',
      },
      cta: {
        body: 'ابدأ بخطوة واضحة. زرنا، اختر هدفك، ودع النظام يساعدك على الالتزام.',
        primary: 'ابدأ الآن',
        secondary: 'تواصل معنا',
        title: 'جاهز لتتدرب بجدية؟',
      },
      equipment: {
        eyebrow: 'التجهيزات',
        title: 'كل زاوية في النادي تخدم هدفا واحدا: تدريب أفضل.',
      },
      facilities: {
        eyebrow: 'المرافق',
        title: 'مساحة تدريب منظمة، قوية، ومريحة للتركيز.',
      },
      hero: {
        body:
          'نظام تدريب عصري يجمع بين صالة احترافية، متابعة رقمية، ومدربين يفهمون معنى الالتزام.',
        eyebrow: 'Pro Gym Homs',
        primary: 'ابدأ تحولك',
        secondary: 'استكشف النادي',
        title: 'القوة ليست شعارا. إنها نظام تعيشه كل يوم.',
      },
      journey: {
        eyebrow: 'رحلة التحول',
        steps: [
          ['قياس', 'نبدأ من وزنك، هدفك، ونقطة قوتك الحالية.'],
          ['خطة', 'تمرين وتغذية ومتابعة تناسب مستواك.'],
          ['التزام', 'حضور، تقدم، وصور تثبت العمل.'],
          ['نتيجة', 'تعديلات مستمرة حتى يصبح التغيير واضحا.'],
        ],
        title: 'من أول يوم إلى أول نتيجة، كل خطوة محسوبة.',
      },
      stats: [
        ['1200+', 'عضو تم دعمه'],
        ['18K+', 'ساعة تدريب'],
        ['94%', 'التزام في أول شهر'],
      ],
      why: {
        eyebrow: 'لماذا Pro Gym',
        items: [
          ['تدريب قابل للقياس', 'كل تقدم له رقم، صورة، أو سجل حضور واضح.'],
          ['مدربون قريبون من هدفك', 'المتابعة ليست وعدا عاما، بل نظام داخل المنصة.'],
          ['تجربة Premium', 'هوية بصرية قوية، حركة محسوبة، وموقع يشعر بالثقة من أول ثانية.'],
        ],
        title: 'النادي الذي يجعل الانضباط أسهل.',
      },
    },
    membership: {
      benefits: ['اشتراكات يومية مرنة', 'متابعة حضور واشتراك', 'برامج تدريب وتغذية', 'إدارة تقدم وصور خاصة'],
      eyebrow: 'العضويات',
      intro:
        'صممنا تجربة العضوية حول الوضوح: تعرف أيامك المتبقية، خطتك الحالية، وتقدمك من لوحة واحدة.',
      title: 'اختر عضوية تعطيك أكثر من مجرد دخول للنادي.',
      tiers: [
        ['30 يوم', 'أفضل بداية لمن يريد الالتزام شهرا كاملا.'],
        ['90 يوم', 'مساحة كافية لرؤية تغير واضح في الجسم والعادة.'],
        ['365 يوم', 'للأعضاء الذين يحولون التدريب إلى أسلوب حياة.'],
      ],
    },
    nav: {
      about: 'عن النادي',
      coaches: 'المدربون',
      contact: 'تواصل',
      home: 'الرئيسية',
      login: 'الدخول',
      membership: 'العضويات',
      menu: 'القائمة',
    },
    seo: {
      about: {
        description: 'تعرف على قصة Pro Gym ورسالته ورؤيته في بناء تجربة تدريب حديثة.',
        title: 'عن Pro Gym',
      },
      coaches: {
        description: 'تعرف على مدربي Pro Gym وخبراتهم في القوة والتحول الجسدي والمتابعة.',
        title: 'مدربو Pro Gym',
      },
      contact: {
        description: 'تواصل مع Pro Gym لبدء عضويتك أو الاستفسار عن التدريب والاشتراكات.',
        title: 'تواصل مع Pro Gym',
      },
      home: {
        description: 'Pro Gym تجربة تدريب Premium في حمص تجمع بين القوة، المتابعة الرقمية، والمدربين المحترفين.',
        title: 'Pro Gym | تدريب Premium للتحول الحقيقي',
      },
      membership: {
        description: 'اكتشف عضويات Pro Gym وفوائد التدريب المنظم والمتابعة الرقمية.',
        title: 'عضويات Pro Gym',
      },
    },
    testimonials: [
      ['تجربة مختلفة من أول أسبوع. المتابعة جعلتني أفهم أين أتقدم فعلا.', 'محمد ع.'],
      ['المدرب يعرف هدفي ويتابع الصور والوزن والحضور. هذا ما كنت أحتاجه.', 'كريم ك.'],
      ['النادي منظم والجو يساعدك تلتزم. لا تشعر أنك وحدك في الخطة.', 'أحمد س.'],
    ],
  },
  en: {
    about: {
      eyebrow: 'About Pro Gym',
      facilityTitle: 'A space engineered for focus',
      highlights: [
        'Strength and cardio zones organized to reduce friction.',
        'A clean, sharp environment built for consistency.',
        'Coaches track progress through numbers, photos, and plans.',
      ],
      mission:
        'Our mission is to make training clear and measurable. Every member knows where they stand, what the plan is, and how progress is moving.',
      story:
        'Pro Gym is more than a room full of equipment. It is a complete training system built around discipline, smart follow-up, and coaches who turn goals into daily habits.',
      title: 'A gym built for people who expect real results.',
      values: ['Discipline', 'Trust', 'Progress', 'Professionalism'],
      vision:
        'Our vision is to set a new standard for the modern gym experience: strong training, clear data, and service members feel from the first visit.',
    },
    coaches: {
      cta: 'Talk to us and choose the coach that fits your goal.',
      eyebrow: 'Coaching Team',
      intro:
        'Specialists in strength, body transformation, nutrition, and daily follow-up. Every plan is built around your body, schedule, and objective.',
      title: 'Practical experience. Real follow-up. Measurable results.',
    },
    contact: {
      address: 'Address',
      cta: 'Send your request and the Pro Gym team will contact you.',
      email: 'Email',
      eyebrow: 'Contact',
      form: {
        goal: 'Your goal',
        message: 'Message',
        name: 'Full name',
        phone: 'Phone number',
        submit: 'Send request',
        success: 'Your request was received. We will contact you soon.',
      },
      map: 'Map placeholder',
      phone: 'Phone',
      title: 'Your transformation can start with one conversation.',
    },
    footer: {
      body: 'A modern training experience combining strength, follow-up, and a bold visual identity.',
      quick: 'Quick links',
      rights: 'All rights reserved.',
    },
    home: {
      benefits: {
        eyebrow: 'Membership',
        items: [
          'Structured access and daily subscription tracking.',
          'Workout and nutrition plans that evolve with you.',
          'Coach requests and private progress photos.',
          'In-app notifications for every important step.',
        ],
        title: 'Membership that feels designed for you, not just entry access.',
      },
      coaches: {
        eyebrow: 'Coaches',
        title: 'The right coach turns a goal into a system.',
      },
      community: {
        body: 'Sharp atmosphere, committed people, and a team that knows members by name and results. Pro Gym builds belonging without noise.',
        title: 'A community that raises the standard.',
      },
      cta: {
        body: 'Start with a clear step. Visit us, choose your goal, and let the system help you stay consistent.',
        primary: 'Start now',
        secondary: 'Contact us',
        title: 'Ready to train seriously?',
      },
      equipment: {
        eyebrow: 'Equipment',
        title: 'Every corner of the club serves one purpose: better training.',
      },
      facilities: {
        eyebrow: 'Facilities',
        title: 'A structured, powerful training space built for focus.',
      },
      hero: {
        body:
          'A modern training system combining a professional facility, digital follow-up, and coaches who understand discipline.',
        eyebrow: 'Pro Gym Homs',
        primary: 'Start transformation',
        secondary: 'Explore the club',
        title: 'Strength is not a slogan. It is a system you live every day.',
      },
      journey: {
        eyebrow: 'Transformation Journey',
        steps: [
          ['Measure', 'We start from your weight, goal, and current strength.'],
          ['Plan', 'Training, nutrition, and follow-up matched to your level.'],
          ['Commit', 'Attendance, progress, and photos prove the work.'],
          ['Transform', 'Continuous adjustments until change becomes visible.'],
        ],
        title: 'From day one to the first result, every step is measured.',
      },
      stats: [
        ['1200+', 'Members supported'],
        ['18K+', 'Training hours'],
        ['94%', 'First-month consistency'],
      ],
      why: {
        eyebrow: 'Why Pro Gym',
        items: [
          ['Measurable training', 'Every improvement has a number, photo, or attendance record behind it.'],
          ['Coaches close to your goal', 'Follow-up is not a vague promise. It is built into the platform.'],
          ['Premium experience', 'Bold identity, measured motion, and a website that feels trusted from second one.'],
        ],
        title: 'The gym that makes discipline easier.',
      },
    },
    membership: {
      benefits: ['Flexible day-based subscriptions', 'Attendance and membership tracking', 'Workout and nutrition plans', 'Private progress photo management'],
      eyebrow: 'Memberships',
      intro:
        'We designed membership around clarity: know your remaining days, current plan, and progress from one dashboard.',
      title: 'Choose a membership that gives more than gym access.',
      tiers: [
        ['30 days', 'The best start for building one full month of consistency.'],
        ['90 days', 'Enough room to see a visible change in body and habit.'],
        ['365 days', 'For members who turn training into a lifestyle.'],
      ],
    },
    nav: {
      about: 'About',
      coaches: 'Coaches',
      contact: 'Contact',
      home: 'Home',
      login: 'Login',
      membership: 'Membership',
      menu: 'Menu',
    },
    seo: {
      about: {
        description: 'Learn the story, mission, and vision behind Pro Gym and its modern training experience.',
        title: 'About Pro Gym',
      },
      coaches: {
        description: 'Meet the Pro Gym coaching team and their expertise in strength, transformation, and follow-up.',
        title: 'Pro Gym Coaches',
      },
      contact: {
        description: 'Contact Pro Gym to start your membership or ask about training and subscriptions.',
        title: 'Contact Pro Gym',
      },
      home: {
        description: 'Pro Gym is a premium training experience in Homs combining strength, digital follow-up, and professional coaching.',
        title: 'Pro Gym | Premium Training for Real Transformation',
      },
      membership: {
        description: 'Explore Pro Gym memberships and the benefits of structured training with digital follow-up.',
        title: 'Pro Gym Memberships',
      },
    },
    testimonials: [
      ['A different experience from week one. The follow-up helped me understand where I was actually improving.', 'Mohammad A.'],
      ['My coach knows my goal and follows photos, weight, and attendance. That is exactly what I needed.', 'Karim K.'],
      ['The gym is organized and the atmosphere helps you commit. You do not feel alone in the plan.', 'Ahmad S.'],
    ],
  },
} satisfies Record<PublicLocale, Record<string, unknown>>;

export const publicCopy = new Proxy(publicCopyBase, {
  get(target, property) {
    if (property === 'ar' || property === 'en') return target[property];
    return target.ar;
  },
}) as typeof publicCopyBase;

export const coaches = [
  {
    experience: { ar: '8 سنوات خبرة', en: '8 years experience' },
    image: {
      alt: { ar: 'المدرب عمر', en: 'Coach Omar' },
      src: '/images/gym/optimized/gym-02.webp',
    },
    name: { ar: 'عمر الخطيب', en: 'Omar Al Khatib' },
    specialty: { ar: 'قوة وتحول جسدي', en: 'Strength and Transformation' },
    bio: {
      ar: 'يبني برامج قوة عملية مع متابعة دقيقة للوزن، القياسات، والحضور.',
      en: 'Builds practical strength programs with close tracking of weight, measurements, and attendance.',
    },
  },
  {
    experience: { ar: '6 سنوات خبرة', en: '6 years experience' },
    image: {
      alt: { ar: 'المدرب كريم', en: 'Coach Karim' },
      src: '/images/gym/optimized/gym-06.webp',
    },
    name: { ar: 'كريم مراد', en: 'Karim Mourad' },
    specialty: { ar: 'لياقة وتغذية', en: 'Fitness and Nutrition' },
    bio: {
      ar: 'يركز على بناء عادة تدريب قابلة للاستمرار وخطط تغذية واضحة.',
      en: 'Focuses on sustainable training habits and clear nutrition planning.',
    },
  },
  {
    experience: { ar: '10 سنوات خبرة', en: '10 years experience' },
    image: {
      alt: { ar: 'المدرب سامي', en: 'Coach Sami' },
      src: '/images/gym/optimized/gym-09.webp',
    },
    name: { ar: 'سامي حمدان', en: 'Sami Hamdan' },
    specialty: { ar: 'أداء وتكنيك', en: 'Performance and Technique' },
    bio: {
      ar: 'يصمم خططا دقيقة لتحسين الأداء، الحركة، وتقليل أخطاء التمرين.',
      en: 'Creates precise plans to improve performance, movement, and training technique.',
    },
  },
] satisfies Array<{
  bio: Record<PublicLocale, string>;
  experience: Record<PublicLocale, string>;
  image: PublicImage;
  name: Record<PublicLocale, string>;
  specialty: Record<PublicLocale, string>;
}>;

export function localizedPath(locale: PublicLocale | string | null | undefined, path = ''): string {
  return `/${resolvePublicLocale(locale)}${path}`;
}

export function getPublicCopy(locale: PublicLocale | string | null | undefined) {
  return publicCopy[resolvePublicLocale(locale)];
}
