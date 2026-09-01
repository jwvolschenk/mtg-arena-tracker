-- CreateTable
-- One-off matches outside the season round-robin (manual pairings /
-- challenges). Full ELO + all-time W/L/D impact, never season standings.
CREATE TABLE "ChallengeMatch" (
    "id" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "winnerId" TEXT,
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "player1EloBefore" INTEGER NOT NULL,
    "player1EloAfter" INTEGER NOT NULL,
    "player2EloBefore" INTEGER NOT NULL,
    "player2EloAfter" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChallengeMatch_playedAt_idx" ON "ChallengeMatch"("playedAt");

-- AddForeignKey
ALTER TABLE "ChallengeMatch" ADD CONSTRAINT "ChallengeMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMatch" ADD CONSTRAINT "ChallengeMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMatch" ADD CONSTRAINT "ChallengeMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
