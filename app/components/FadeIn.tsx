"use client";

import { Box } from '@mui/material';
import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

interface FadeInProps {
    children: ReactNode;
    delay?: number;
    duration?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

const FadeIn: React.FC<FadeInProps> = ({
    children,
    delay = 0,
    duration = 0.5,
    direction = 'up',
}) => {
    const directionOffset = {
        up: { y: 40, x: 0 },
        down: { y: -40, x: 0 },
        left: { y: 0, x: 40 },
        right: { y: 0, x: -40 },
        none: { y: 0, x: 0 },
    };

    const variants: Variants = {
        hidden: {
            opacity: 0,
            ...directionOffset[direction],
        },
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
                duration,
                delay,
                ease: [0.4, 0, 0.2, 1],
            },
        },
    };

    return (
        <Box
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={variants}
            sx={{ width: '100%' }}
        >
            {children}
        </Box>
    );
};

export default FadeIn;
