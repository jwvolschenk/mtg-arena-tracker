-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckCard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "board" TEXT NOT NULL DEFAULT 'main',
    "position" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "collectorNumber" TEXT NOT NULL,
    "scryfallId" TEXT,
    "manaCost" TEXT,
    "typeLine" TEXT,
    "colors" TEXT,
    "cmc" INTEGER,
    "rarity" TEXT,
    "artPath" TEXT,

    CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deck_memberId_idx" ON "Deck"("memberId");

-- CreateIndex
CREATE INDEX "DeckCard_deckId_idx" ON "DeckCard"("deckId");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
