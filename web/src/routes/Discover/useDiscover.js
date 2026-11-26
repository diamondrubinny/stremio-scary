// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const UrlUtils = require('url');
const { useCore } = require('stremio/core');
const { useModelState } = require('stremio/common');
const { default: useScaryAddon } = require('stremio/scary/content/useScaryAddon');
const { defaultDiscoverRequest, narrowDiscover } = require('stremio/scary/content/discover');

const map = (discover) => ({
    ...discover,
    catalog: discover.catalog !== null && discover.catalog.content.type === 'Ready' ?
        {
            ...discover.catalog,
            content: {
                ...discover.catalog.content,
                content: discover.catalog.content.content.map((metaItem) => ({
                    ...metaItem,
                    released: new Date(typeof metaItem.released === 'string' ? metaItem.released : NaN),
                }))
            }
        }
        :
        discover.catalog
});

const useDiscover = (urlParams, queryParams) => {
    const core = useCore();
    const scaryAddon = useScaryAddon();
    const loadNextPage = React.useCallback(() => {
        core.transport.dispatch({
            action: 'CatalogWithFilters',
            args: {
                action: 'LoadNextPage'
            }
        }, 'discover');
    }, []);
    const action = React.useMemo(() => {
        if (typeof urlParams.transportUrl === 'string' && typeof urlParams.type === 'string' && typeof urlParams.catalogId === 'string') {
            const { hostname } = UrlUtils.parse(urlParams.transportUrl);
            if (typeof hostname === 'string' && hostname.length > 0) {
                return {
                    action: 'Load',
                    args: {
                        model: 'CatalogWithFiltersSelection',
                        args: {
                            request: {
                                base: urlParams.transportUrl,
                                path: {
                                    resource: 'catalog',
                                    type: urlParams.type,
                                    id: urlParams.catalogId,
                                    extra: Array.from(queryParams.entries())
                                }
                            }
                        }
                    }
                };
            }
        } else {
            return {
                action: 'Load',
                args: {
                    model: 'CatalogWithFiltersSelection',
                    args: scaryAddon !== null ? { request: defaultDiscoverRequest(scaryAddon) } : null
                }
            };
        }

        return {
            action: 'Unload'
        };
    }, [urlParams, queryParams, scaryAddon]);
    const discover = useModelState({ model: 'discover', action, map, deps: ['ctx'] });
    const scaryDiscover = React.useMemo(() => narrowDiscover(discover, scaryAddon), [discover, scaryAddon]);
    return [scaryDiscover, loadNextPage];
};

module.exports = useDiscover;
