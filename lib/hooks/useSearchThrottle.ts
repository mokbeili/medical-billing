import { useCallback, useEffect, useState } from "react";

interface UseSearchThrottleOptions {
  minLength?: number;
  debounceMs?: number;
  throttleMs?: number;
}

export function useSearchThrottle<T>(
  searchFn: (query: string) => Promise<T[]>,
  options: UseSearchThrottleOptions = {}
) {
  const { minLength = 2, debounceMs = 300, throttleMs = 1000 } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minLength) {
        setResults([]);
        return;
      }

      const now = Date.now();
      if (now - lastSearchTime < throttleMs) {
        return;
      }

      setIsSearching(true);
      try {
        const data = await searchFn(searchQuery);
        setResults(data);
        setLastSearchTime(now);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchFn, minLength, throttleMs, lastSearchTime]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, performSearch, debounceMs]);

  return {
    query,
    setQuery,
    results,
    isSearching,
  };
}
