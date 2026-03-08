/**
 * File storage types — FileAsset.
 * Mirrors: src/files/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  File Asset                                                         */
/* ------------------------------------------------------------------ */

/** Low-level S3 file record (FileAssetSerializer). */
export interface FileAsset {
  id: string;                    // UUID
  organization: string;          // UUID
  uploaded_by: number;
  uploaded_by_name: string;
  original_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  is_public: boolean;
  presigned_url: string | null;
  created_at: string;
  updated_at: string;
}
