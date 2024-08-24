-- CreateTable
CREATE TABLE "AnimeList" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anime" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "animeListId" INTEGER NOT NULL,

    CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MalToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnimeList_username_key" ON "AnimeList"("username");

-- CreateIndex
CREATE UNIQUE INDEX "MalToken_username_key" ON "MalToken"("username");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_username_key" ON "OAuthState"("username");

-- AddForeignKey
ALTER TABLE "Anime" ADD CONSTRAINT "Anime_animeListId_fkey" FOREIGN KEY ("animeListId") REFERENCES "AnimeList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
