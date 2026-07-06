UPDATE "GymSettings"
SET
  "openingHours" = '{
    "friday": {"opens": "14:00", "closes": "19:00"},
    "saturdayThroughThursday": {"opens": "07:00", "closes": "12:00"}
  }'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "singletonKey" = 'primary';
