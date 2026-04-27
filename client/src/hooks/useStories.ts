import { useState, useEffect, useRef } from "react";
import apiClient from "../api/client";
import type { OneShot } from "../features/stories/types/types";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseStoriesOptions {
  author?: string;
  limit?: number;
  skip?: number;
}

// Simple in-memory cache
const storiesCache = new Map<string, { data: OneShot[]; timestamp: number }>();
const cacheEvents = new EventTarget();
const CACHE_INVALIDATED_EVENT = "storiesCacheInvalidated";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (options?: UseStoriesOptions): string => {
  if (!options) return "stories_all";
  return `stories_${options.author || "all"}_${options.limit || 50}_${options.skip || 0}`;
};

export const useStories = (options?: UseStoriesOptions) => {
  const [state, setState] = useState<FetchState<OneShot[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous requests
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const fetchStories = async () => {
      const cacheKey = getCacheKey(options);
      const cached = storiesCache.get(cacheKey);

      // Check if we have valid cache
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setState({
          data: cached.data,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        setState((prev) => ({ ...prev, loading: true }));

        // Build query string
        const params = new URLSearchParams();
        if (options?.author) params.append("author", options.author);
        if (options?.limit) params.append("limit", String(options.limit));
        if (options?.skip) params.append("skip", String(options.skip));

        const queryString = params.toString();
        const endpoint = queryString ? `/stories?${queryString}` : "/stories";

        const response = await apiClient.get<any>(endpoint, {
          signal: abortControllerRef.current?.signal,
        });

        // Handle both old format (array) and new format ({ data, pagination })
        let data: OneShot[];
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        } else {
          data = response.data.stories || response.data.works || [];
        }

        // Store in cache
        storiesCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });

        setState({
          data,
          loading: false,
          error: null,
        });
      } catch (error) {
        // Don't set error state if request was aborted
        if (error instanceof Error && error.name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error : new Error("Unknown error"),
            loading: false,
          }));
        }
      }
    };

    const handleCacheInvalidated = () => {
      fetchStories();
    };

    cacheEvents.addEventListener(
      CACHE_INVALIDATED_EVENT,
      handleCacheInvalidated,
    );

    fetchStories();

    return () => {
      abortControllerRef.current?.abort();
      cacheEvents.removeEventListener(
        CACHE_INVALIDATED_EVENT,
        handleCacheInvalidated,
      );
    };
  }, [options?.author, options?.limit, options?.skip]);

  return state;
};

// Helper to invalidate cache
export const invalidateStoriesCache = () => {
  storiesCache.clear();
  cacheEvents.dispatchEvent(new Event(CACHE_INVALIDATED_EVENT));
};
