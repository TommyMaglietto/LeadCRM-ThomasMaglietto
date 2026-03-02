import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay in milliseconds.
 * The returned value will only update after the delay has passed
 * since the last change to the input value.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
