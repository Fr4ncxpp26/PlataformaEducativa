import { useCallback, useEffect, useState } from 'react';
import type { SetStateAction } from 'react';
import { api, errorMessage } from '../lib/api';

interface ResourceState<T> {
    path: string | null;
    request: number;
    data: T | null;
    error: string;
}

// La carga se deriva de la clave de petición; el efecto solo sincroniza el GET.
export function useApi<T>(path: string | null) {
    const [state, setState] = useState<ResourceState<T>>({
        path: null,
        request: -1,
        data: null,
        error: '',
    });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!path) return;

        let active = true;
        api<T>(path)
            .then((data) => {
                if (active) setState({ path, request: tick, data, error: '' });
            })
            .catch((error: unknown) => {
                if (!active) return;
                setState((current) => ({
                    path,
                    request: tick,
                    data: current.path === path ? current.data : null,
                    error: errorMessage(error),
                }));
            });

        return () => { active = false; };
    }, [path, tick]);

    const samePath = state.path === path;
    const currentRequest = samePath && state.request === tick;
    const data = samePath ? state.data : null;
    const error = currentRequest ? state.error : '';
    const loading = Boolean(path) && !currentRequest;

    const reload = useCallback(() => setTick((value) => value + 1), []);
    const updateData = useCallback((updater: SetStateAction<T | null>) => {
        setState((current) => {
            if (current.path !== path || current.request !== tick) return current;
            return {
                ...current,
                data: typeof updater === 'function'
                    ? (updater as (previous: T | null) => T | null)(current.data)
                    : updater,
            };
        });
    }, [path, tick]);

    return { data, error, loading, reload, updateData };
}
