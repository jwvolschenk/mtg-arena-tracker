-- AlterEnum
-- SKIPPED marks a matchup that will not be played (e.g. a duelist had to
-- drop out). It records no result and moves no ELO; it only lets the
-- season settle without the fixture.
ALTER TYPE "MatchupStatus" ADD VALUE 'SKIPPED';
