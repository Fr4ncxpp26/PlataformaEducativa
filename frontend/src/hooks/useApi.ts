import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';

// GET con estado de carga/error. path=null no hace petición.
export function useApi<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(Boolean(path));
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!path) { setData(null); setLoading(false); return; }
        let active = true;
        setLoading(true);
        setError('');
        api<T>(path)
            .then((d) => { if (active) setData(d); })
            .catch((e) => { if (active) setError(errorMessage(e)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [path, tick]);

    const reload = useCallback(() => setTick((t) => t + 1), []);
    return { data, error, loading, reload };
}