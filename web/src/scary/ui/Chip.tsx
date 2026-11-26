// SPDX-License-Identifier: GPL-2.0-only
// SCARY Web · Powered by SCARY · https://github.com/diamondrubinny/Scary · Copyright (C) 2026 diamondrubinny

import React from 'react';
import classnames from 'classnames';
import { Button } from 'stremio/components';
import styles from './scary.less';

type Props = {
    label: string,
    chosen?: boolean,
    quiet?: boolean,
    href?: string,
    title?: string,
    children?: React.ReactNode,
    onClick?: () => void,
};

/** A choice in a line of choices. `chosen` is told to screen readers as pressed, not by colour alone. */
const Chip = ({ label, chosen, quiet, href, title, children, onClick }: Props) => (
    <Button
        className={classnames(styles['chip'], { [styles['chosen']]: chosen, [styles['quiet']]: quiet })}
        title={title ?? label}
        href={href}
        aria-pressed={typeof chosen === 'boolean' ? chosen : undefined}
        onClick={onClick}
    >
        {children}
        {label}
    </Button>
);

export default Chip;
