-- Choice changes by students, admins and supervisors are now logged too.
-- Existing rows were all written by mentors.
ALTER TABLE "MentorLog" ADD COLUMN "actorRole" "Role" NOT NULL DEFAULT 'MENTOR';
