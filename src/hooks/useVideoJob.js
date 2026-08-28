import { useEffect, useRef, useState } from "react";
import { repostApi } from "../api/repost";

// Interroge périodiquement le statut d'une campagne jusqu'à ce qu'elle soit
// terminée ou en échec — même principe que le hook fourni initialement,
// adapté pour passer par notre client axios (avec JWT) plutôt que fetch brut.
export function useVideoJob(jobId, onUpdate) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!jobId) return undefined;

    let cancelled = false;

    async function poll() {
      try {
        const { data } = await repostApi.getJob(jobId);
        if (cancelled) return;
        setJob(data);
        onUpdate?.(data);
        if (data.status !== "completed" && data.status !== "failed") {
          timerRef.current = window.setTimeout(poll, 1500);
        } else {
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timerRef.current);
    };
  }, [jobId]);

  return { job, loading };
}
