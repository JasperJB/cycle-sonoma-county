ALTER TABLE "User"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

UPDATE "User"
SET
  "firstName" = CASE
    WHEN "displayName" IS NULL OR trim("displayName") = '' THEN NULL
    ELSE split_part(trim("displayName"), ' ', 1)
  END,
  "lastName" = CASE
    WHEN "displayName" IS NULL OR trim("displayName") = '' OR position(' ' in trim("displayName")) = 0 THEN NULL
    ELSE trim(substring(trim("displayName") from position(' ' in trim("displayName")) + 1))
  END
WHERE "firstName" IS NULL AND "lastName" IS NULL;
