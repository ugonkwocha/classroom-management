CREATE TABLE "ProgramLevelSetting" (
    "id" TEXT NOT NULL,
    "level" "ProgramLevel" NOT NULL,
    "displayName" TEXT NOT NULL,
    "ageRange" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramLevelSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramLevelSetting_level_key" ON "ProgramLevelSetting"("level");
CREATE INDEX "ProgramLevelSetting_sortOrder_idx" ON "ProgramLevelSetting"("sortOrder");

INSERT INTO "ProgramLevelSetting" ("id", "level", "displayName", "ageRange", "description", "sortOrder", "updatedAt") VALUES
  ('program-level-creators', 'CREATORS', 'Creators', 'Ages 6-8', 'Entry-level coding and creative technology courses for younger learners.', 1, CURRENT_TIMESTAMP),
  ('program-level-innovators', 'INNOVATORS', 'Innovators', 'Ages 9-11', 'Intermediate courses for learners building stronger programming foundations.', 2, CURRENT_TIMESTAMP),
  ('program-level-inventors', 'INVENTORS', 'Inventors', 'Ages 12-16', 'Advanced project-based courses for older learners and teen builders.', 3, CURRENT_TIMESTAMP)
ON CONFLICT ("level") DO NOTHING;
