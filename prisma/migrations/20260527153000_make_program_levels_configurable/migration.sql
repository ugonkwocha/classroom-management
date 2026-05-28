ALTER TABLE "Course"
  ALTER COLUMN "programLevels" TYPE TEXT[]
  USING "programLevels"::TEXT[];

ALTER TABLE "Class"
  ALTER COLUMN "programLevel" TYPE TEXT
  USING "programLevel"::TEXT;

ALTER TABLE "ProgramLevelSetting"
  ALTER COLUMN "level" TYPE TEXT
  USING "level"::TEXT;

DROP TYPE "ProgramLevel";
