// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// The icon of Stremio Web, drawing SCARY's icons. webpack.config.js answers "@stremio/stremio-icons/react" with this
// file, so every screen gets SCARY's set without being changed. A name SCARY has not drawn (another company's mark,
// or an icon Stremio adds later) falls back to the original.

// The props are checked by TypeScript (Props), not by prop-types.
/* eslint-disable react/prop-types */

import React from 'react';
import OriginalIcon from 'stremio-icons-original';
import { DIRECTIONAL_ICONS, ICONS } from './icons';

type Props = {
    className?: string,
    name: string,
};

const LINE: React.CSSProperties = {
    fill: 'none',
    stroke: 'currentcolor',
    strokeWidth: 1.7,
    strokeLinecap: 'square',
    strokeLinejoin: 'miter',
    strokeMiterlimit: 8,
};

const SOLID: React.CSSProperties = {
    fill: 'currentcolor',
    fillRule: 'evenodd',
    stroke: 'none',
};

const Icon = React.memo(React.forwardRef<SVGSVGElement, Props>(({ className, name }, ref) => {
    const glyph = Object.hasOwn(ICONS, name) ? ICONS[name] : null;
    if (glyph === null) {
        return <OriginalIcon ref={ref} className={className} name={name} />;
    }
    return (
        <svg ref={ref} className={className} viewBox={'0 0 24 24'} data-scary-directional={DIRECTIONAL_ICONS.includes(name) ? '' : undefined}>
            {
                glyph.map((shape, index) => typeof shape === 'string' ?
                    <path key={index} d={shape} style={LINE} />
                    : 'fill' in shape ?
                        <path key={index} d={shape.fill} style={SOLID} />
                        :
                        <path key={index} d={shape.line} style={{ ...LINE, strokeWidth: shape.width, strokeLinecap: 'round', strokeLinejoin: 'round' }} />)
            }
        </svg>
    );
}));

Icon.displayName = 'Icon';

export default Icon;
