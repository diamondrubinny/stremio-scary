// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

// Stremio's own icon component, under the name webpack.config.js gives it (see src/scary/icons/index.tsx).
declare module 'stremio-icons-original' {
    import type React from 'react';

    const Icon: React.MemoExoticComponent<React.ForwardRefExoticComponent<{ className?: string, name: string } & React.RefAttributes<SVGSVGElement>>>;
    export default Icon;
}
