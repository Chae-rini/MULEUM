"use client";

import { useEffect, useState } from "react";
import { readStored, writeStored } from "./model";

export function useLocalStore<T>(key: string, initial: T, validate: (value: unknown) => value is T) {
  const [data, setData] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    try {
      setData(readStored(window.localStorage, key, initial, validate));
    } catch {
      setError("저장된 기록을 읽을 수 없어요. 기존 데이터 보호를 위해 이 화면의 저장을 중단했어요. 브라우저 저장 설정을 확인해 주세요.");
      setBlocked(true);
    }
    setReady(true);
    // Other tabs must not silently overwrite newer records from this tab.
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        setBlocked(true);
        setError("다른 탭에서 기록이 바뀌었어요. 입력 중인 내용을 복사한 뒤 새로고침해 주세요.");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, initial, validate]);

  function save(next: T): boolean {
    if (!ready || blocked) return false;
    try {
      writeStored(window.localStorage, key, next);
      setData(next);
      setError("");
      return true;
    } catch {
      setError("브라우저에 저장하지 못했어요. 입력 내용은 그대로 두었어요. 저장 공간이나 브라우저 설정을 확인한 뒤 다시 시도해 주세요.");
      return false;
    }
  }
  return { data, ready, error, blocked, save };
}
