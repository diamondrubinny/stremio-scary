// Copyright (C) 2017-2026 Smart code 203358507

import { useMemo } from 'react';
import useModelState from 'stremio/common/useModelState';
import { isScaryTransportUrl } from 'stremio/scary/content/addon';

const useBoardCatalogs = (all: boolean): BoardCatalogs => {
    const action = useMemo(() => ({
        action: 'Load',
        args: {
            model: 'BoardCatalogs',
            args: { all },
        },
    }), [all]);
    const boardCatalogs = useModelState({ model: 'board_catalogs', action, deps: ['ctx'] }) as BoardCatalogs;
    // SCARY: the spotlight chooses among SCARY's own rows.
    return useMemo(() => ({
        ...boardCatalogs,
        catalogs: (boardCatalogs.catalogs ?? []).filter(({ request }) => isScaryTransportUrl(request?.base)),
    }), [boardCatalogs]);
};

export default useBoardCatalogs;
