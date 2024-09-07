import { create } from '@kodingdotninja/use-tailwind-breakpoint'
import tailwindConfig from 'tailwindcss/defaultConfig' // todo: load custom config
import resolveConfig from 'tailwindcss/resolveConfig'

const config = resolveConfig(tailwindConfig)

export const { useBreakpoint, useBreakpointValue, useBreakpointEffect } = create(config.theme.screens);
