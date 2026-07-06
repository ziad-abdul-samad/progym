UPDATE "GymSettings"
SET
  "addressAr" = 'الإنشاءات مقابل الفرن الآلي',
  "addressEn" = 'Al-Inshaat, opposite the automatic bakery',
  "email" = NULL,
  "latitude" = 34.717998,
  "logoUrl" = '/images/gym/log_bw.jpeg',
  "longitude" = 36.697080,
  "phone" = '2213324',
  "socialLinks" = '{"instagram":"https://www.instagram.com/progym.homs/"}'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "singletonKey" = 'primary';
