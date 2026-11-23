"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const messageDismissDelay = 3000;

export function useAutoDismissMessage(): [string, (message: string) => void] {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((nextMessage: string) => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    setMessage(nextMessage);
    timeoutRef.current = nextMessage
      ? setTimeout(() => {
          setMessage("");
          timeoutRef.current = null;
        }, messageDismissDelay)
      : null;
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return [message, showMessage];
}
