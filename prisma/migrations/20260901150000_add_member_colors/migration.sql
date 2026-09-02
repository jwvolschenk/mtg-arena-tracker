-- Deck-color flair shown around a member's avatar, stored as canonical
-- WUBRG-order letters (e.g. "GB"). Null = no colors chosen.
ALTER TABLE "Member" ADD COLUMN "colors" TEXT;
