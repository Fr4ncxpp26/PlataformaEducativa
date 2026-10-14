import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Option } from '../lib/constants';

type Kind = 'subjects' | 'courses' | 'teachers' | 'students' | 'guardians' | 'minors';

// Listas {value,label} para <select>. scope 'manage' sirve para profesores (solo materias).
export function useOptions(kind: Kind, scope: 'admin' | 'manage' = 'admin') {
    const [options, setOptions] = useState<Option[]>([]);
    useEffect(() => {
        let active = true;
        api<{ data: Option[] }>(`/${scope}/options/${kind}`)
            .then((r) => { if (active) setOptions(r.data); })
            .catch(() => undefined);
        return () => { active = false; };
    }, [kind, scope]);
    return options;
}