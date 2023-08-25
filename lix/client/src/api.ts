import type { NodeishFilesystem } from "@inlang-git/fs"
import type raw from "isomorphic-git"
import type { Endpoints } from "@octokit/types"

type Author = {
	name?: string
	email?: string
	timestamp?: number
	timezoneOffset?: number
}

export type Repository = {
	nodeishFs: NodeishFilesystem
	commit: (args: {
		author: Author
		message: string
	}) => Promise<Awaited<ReturnType<typeof raw.commit>> | undefined>
	push: () => Promise<Awaited<ReturnType<typeof raw.push>> | undefined>
	pull: (args: { author: Author; fastForward: boolean; singleBranch: true }) => any
	add: (args: { filepath: string }) => Promise<Awaited<ReturnType<typeof raw.add>>>
	listRemotes: () => Promise<Awaited<ReturnType<typeof raw.listRemotes>> | undefined>
	log: (args?: { since?: Date; depth?: number }) => Promise<Awaited<ReturnType<typeof raw.log>>>
	statusMatrix: (args: { filter: any }) => Promise<Awaited<ReturnType<typeof raw.statusMatrix>>>
	status: (args: { filepath: string }) => Promise<Awaited<ReturnType<typeof raw.status>>>
	mergeUpstream: (args: {
		branch: string
	}) => Promise<
		Endpoints["POST /repos/{owner}/{repo}/merge-upstream"]["response"]["data"] | undefined
	>
	isCollaborator: (args: { username: string }) => Promise<boolean>
	getOrigin: () => Promise<string>
	getCurrentBranch: () => Promise<string | undefined>
	errors: { subscribe: (callback: (value: Error) => void) => () => void }
	getMeta: () => Promise<{
		name: string
		isPrivate: boolean
		isFork: boolean
		owner: { name?: string; email?: string }
		parent:
			| {
					url: string
					fullName: string
			  }
			| undefined
	}>

	// TODO: implement these before publishing api, but not used in badge or editor, depends on strategy for statelessness
	// currentBranch: () => unknown
	// changeBranch: () => unknown
}