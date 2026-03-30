/**
 * Frontend-Backend Integration Contracts
 *
 * This module exports TypeScript interfaces for integrating frontend applications
 * with the Django Core-App backend. These contracts define the interface patterns
 * documented in the integration guides.
 *
 * @packageDocumentation
 */

// Core types
export type {
  RequestState,
  User,
  Credentials,
  Organization,
  Project,
  RequestOptions,
  ApiResponse,
  CachedResponse,
  CacheInvalidationOptions,
  ContextHeaders,
} from './types';

export {
  ApiError,
  PermissionDeniedError,
  ClientError,
  ServerError,
  NetworkError,
} from './types';

// Authentication
export type { AuthProvider, UseAuth } from './auth';

// Context management
export type {
  ContextProvider,
  UseContext,
} from './context';

// API client
export type {
  ApiClient,
  RequestConfig,
  CreateApiClient,
} from './api-client';

// Cache policy
export type {
  CachePolicy,
  CacheConfig,
  CreateCachePolicy,
} from './cache';
