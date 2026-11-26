// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const UrlUtils = require('url');
const { useCore } = require('stremio/core');
const { useModelState } = require('stremio/common');
const { default: useScaryAddon } = require('stremio/scary/content/useScaryAddon');
const { defaultDiscoverRequest, narrowDiscover } = require('stremio/scary/content/discover');
const { useScaryRules } = require('stremio/scary/hooks');

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
    // Family night: only the gentlest films of SCARY's library are shown, here as everywhere.
    const scaryRules = useScaryRules(false);
    const scaryHidden = React.useMemo(() => scaryRules.familyNight ? (id) => scaryRules.library.status !== 'ready' || scaryRules.isHidden(scaryRules.library.byId.get(id)) : null, [scaryRules]);
    const scaryDiscover = React.useMemo(() => narrowDiscover(discover, scaryAddon, scaryHidden), [discover, scaryAddon, scaryHidden]);
    return [scaryDiscover, loadNextPage];
};

module.exports = useDiscover;
