CREATE TABLE "FileAssetBlob" (
    "fileAssetId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "FileAssetBlob_pkey" PRIMARY KEY ("fileAssetId")
);

ALTER TABLE "FileAssetBlob"
ADD CONSTRAINT "FileAssetBlob_fileAssetId_fkey"
FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
