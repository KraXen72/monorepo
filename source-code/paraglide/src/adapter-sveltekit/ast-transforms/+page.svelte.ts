import type { TransformConfig } from "../vite-plugin/config/index.js"
import { transformSvelte } from "./_.svelte.js"

export const transformPageSvelte = (
	filePath: string,
	config: TransformConfig,
	code: string,
	root: boolean,
) => {
	return transformSvelte(filePath, config, code)
}