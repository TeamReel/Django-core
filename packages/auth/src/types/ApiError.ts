/**
 * Normalized API error format.
 * Parsed from B13 error envelope responses.
 */
export interface ApiError {
  /** HTTP status code */
  status: number;
  /** Field-specific validation errors (field name -> error messages) */
  fieldErrors: Record<string, string[]>;
  /** Form-level errors (not tied to specific fields) */
  formErrors: string[];
}
