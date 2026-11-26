// Copyright (C) 2017-2025 Smart code 203358507

import React from 'react';
import routes from 'stremio/routes';
import { PLAYER_PATH, META_DETAILS_PATH, LEGACY_META_DETAILS_PATH } from './getBackFallback';

import { ACCOUNTS_ENABLED } from 'stremio/scary/account';
import ScaryPages from 'stremio/scary/ui/Pages';

export default [
    ...(ACCOUNTS_ENABLED ? [{
        path: '/intro',
        view: 1,
        element: <routes.Intro />,
    }] : []),
    {
        path: '/discover/:transportUrl?/:type?/:catalogId?',
        view: 1,
        element: <routes.Discover />,
    },
    {
        path: '/library/:type?',
        view: 1,
        element: <routes.Library />,
    },
    {
        path: '/calendar/:year?/:month?',
        view: 1,
        element: <routes.Calendar />,
    },
    {
        path: '/continuewatching/:type?',
        view: 1,
        element: <routes.Library />,
    },
    {
        path: '/search',
        view: 1,
        element: <routes.Search />,
    },
    {
        path: META_DETAILS_PATH,
        view: 2,
        element: <routes.Details />,
    },
    {
        path: LEGACY_META_DETAILS_PATH,
        view: 2,
        element: <routes.Details />,
    },
    {
        path: '/addons/:type?/:transportUrl?/:catalogId?',
        view: 3,
        element: <routes.Addons />,
    },
    {
        path: '/scary/:page?',
        view: 3,
        element: <ScaryPages />,
    },
    {
        path: '/settings/:page?',
        view: 3,
        element: <routes.Settings />,
    },
    {
        path: PLAYER_PATH,
        view: 4,
        element: <routes.Player />,
    },
    {
        path: '/',
        view: 0,
        element: <routes.Board />,
    },
    {
        path: '*',
        view: 1,
        element: <routes.NotFound />,
    },
];
