import { decodeBuffer, encodePkLine } from "../isomorphic-git-forks/git-fetch-request-helpers.js";

const WANT_PREFIX = 'want ';

/*
 * overrides all wants in the given lines with the ids provided in oids
 * 
 * a set of orginal lines used to fetch a commit
 * [
 * "want d7e62aef79d771d1771cb44c9e01faa4b7a607fe multi_ack_detailed no-done side-band-64k ofs-delta agent=git/isomorphic-git@1.24.5\n",
 * "deepen 1\n",
 * "", // flush
 * "done\n",
 * ]
 * with an array of oids passed like 
 * [
 *   "1111111111111111111111111111111111111111",
 *   "2222222222222222222222222222222222222222",
 * ]
 * 
 * would result in:
 * [
 * "want 1111111111111111111111111111111111111111 multi_ack_detailed no-done side-band-64k ofs-delta agent=git/isomorphic-git@1.24.5\n",
 * "want 2222222222222222222222222222222222222222\n"
 * "deepen 1\n",
 * "", // flush
 * "done\n",
 * ]
 * 
 * @param lines the lines of the original request
 * @returns the updated lines with wants lines containing the passed oids
 */
function overrideWants(lines: string[], oids: string[]) {
	const newLines = []
	let wantsCount = 0

	let lastLineWasAWants = false

	// override existing wants
	for (const line of lines) {
		if (line.startsWith(WANT_PREFIX)) {
			lastLineWasAWants = true
			if (oids.length > wantsCount) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we check the length of the array in the step before
				const postOidCurrentLine = line.slice(
					Math.max(0, WANT_PREFIX.length + oids[wantsCount]!.length)
				)
				newLines.push(`${WANT_PREFIX}${oids[wantsCount]}${postOidCurrentLine}`)
			}
			wantsCount += 1
		}

		if (!line.startsWith(WANT_PREFIX)) {
			if (lastLineWasAWants && oids.length > wantsCount) {
				while (oids.length > wantsCount) {
					newLines.push(WANT_PREFIX + oids[wantsCount] + "\n")
					wantsCount += 1
				}
				lastLineWasAWants = false
			}
			newLines.push(line)
		}
	}

	return newLines
}


/*
 * 
 * adds "allow-tip-sha1-in-want", "allow-reachable-sha1-in-want" and "no-progress" as capabilities (appends it to the first wants line found) to be able to fetch specific blobs by there hash 
 * compare: https://git-scm.com/docs/git-rev-list#Documentation/git-rev-list.txt---filterltfilter-specgt
 * 
 * The Orginal lines without the capabilities could look like this:
 * 
 * [
 * "want d7e62aef79d771d1771cb44c9e01faa4b7a607fe multi_ack_detailed no-done side-band-64k ofs-delta agent=git/isomorphic-git@1.24.5\n",
 * "deepen 1\n",
 * "", // flush
 * "done\n",
 * ]
 * ----
 * 
 * 
 * The returned lines will look like this:
 * 
 * [
 * "want d7e62aef79d771d1771cb44c9e01faa4b7a607fe multi_ack_detailed no-done side-band-64k ofs-delta agent=git/isomorphic-git@1.24.5 allow-tip-sha1-in-want allow-reachable-sha1-in-want no-progress\n",
 * "deepen 1\n",
 * "", // flush
 * "done\n",
 * ]
 * 
 * @param lines the lines of the original request
 * @returns 
 */
function addWantsCapabilities(lines: string[]) {
	let capabilitiesAdded = false;
	const updatedLines = [];
	for (let line of lines) {
		if (line.startsWith(WANT_PREFIX) && !capabilitiesAdded) {
			// lets take the original line withouth the trailing \n and add the new capabilities
			// no-progress to skip informal stream that gives input about objects packed etc (https://git-scm.com/docs/protocol-capabilities#_no_progress)
			// allow-tip-sha1-in-want allow-reachable-sha1-in-want to use wants  https://git-scm.com/docs/protocol-capabilities#_allow_reachable_sha1_in_want // TODO #1459 check what if we can only use  allow-reachable-sha1-in-want 
			line =
				line.slice(0, Math.max(0, line.length - 1)) +
				" allow-tip-sha1-in-want allow-reachable-sha1-in-want no-progress\n"
			line =line.replace('ofs-delta', '')
			capabilitiesAdded = true;

		}
		updatedLines.push(line);
	}
	return updatedLines;
}

/*
 * 
 * adds filter=blob:none to the request represented by the given lines
 * compare: https://git-scm.com/docs/git-rev-list#Documentation/git-rev-list.txt---filterltfilter-specgt
 * 
 * The Orginal lines without blob filter could look like this:
 * 
 * [
 * "want d7e62aef79d771d1771cb44c9e01faa4b7a607fe multi_ack_detailed no-done side-band-64k ofs-delta agent=git/isomorphic-git@1.24.5",
 * "deepen 1",
 * "",
 * "done",
 * ]
 * ----
 * 
 * The returned lines will add the filter as capability into the first want line and adds filter blob:none after the deepen 1 line
 * 
 * The returned lines will look like this:
 * 
 * [
 * "want d7e62aef79d771d1771cb44c9e01faa4b7a607fe multi_ack_detailed no-done side-band-64k ofs-delta agent=git/isomorphic-git@1.24.5 filter",
 * "deepen 1",
 * "filter blob:none"
 * "",
 * "done",
 * ]
 * 
 * @param lines the lines of the original request
 * @returns 
 */
function addBlobNoneFilter(lines: string[]) {
	
	let filterCapabilityAdded = false;
	let filterAdded = false;
	
	const updatedLines = [];
	const flushLine = '';

	for (let line of lines) {
		// finds the first wants line - and append the filter capability and adds "filter" after last wants line - this is capability declaration is needed for filter=blob:none to work
		// see: https://git-scm.com/docs/protocol-capabilities#_filter
		if (line.startsWith('want') && !filterCapabilityAdded) { 
			line = line.slice(0, Math.max(0, line.length - 1)) + " filter\n"
			filterCapabilityAdded = true;
		}

		// insert the filter blon:none before the deepen since or the deepen not if both not exist before the flush...
		// see: https://git-scm.com/docs/git-rev-list#Documentation/git-rev-list.txt---filterltfilter-specgt
		if (!filterAdded && 
			(line.startsWith('deepen-since') 
				|| line.startsWith('deepen-not') 
				|| line === flushLine)) {
			updatedLines.push('filter blob:none\n');
			filterAdded = true;
		}

		updatedLines.push(line);

	}

	return updatedLines;
}



/**
 * Helper method taking lines about to be sent to git-upload-pack and replaceses the haves part with the overrides provided
 * NOTE: this method was used to fetch only a subset of oids by building by substracting the them from all oids from the repo
 *  now that we foud out about "allow-tip-sha1-in-want allow-reachable-sha1-in-want " capabilites we no longer use this
 * @param lines
 * @param oids 
 * @returns 
 */
function overrideHaves(lines: string[], oids: string[]) {
	// flush line is the only line with an empty string 
	const linesWithoutHaves = [];
	const flushLine = '';
	
	// delete existing haves
	for (const line of lines) {
		if (!line.startsWith('have ')) {
			linesWithoutHaves.push(line);
		}
	}

	const updatedLines = [];
	for (const line of linesWithoutHaves) {
		updatedLines.push(line);
		if ( line === flushLine) {
			for (const oid of oids) {
				updatedLines.push('have '+oid+'\n');
			}
		}
	}
	return updatedLines;
}

/***
 * Proxies http requests to change request befor submittion to git. 
 * This takes the request, decodes the request body and extracts each line in the format of the git-upload-pack protocol (https://git-scm.com/docs/gitprotocol-v2)
 * and allows us to rewrite the request to add filters like blob:none (noneBlobFilter) or request only specific oids (overrideWants) or block list specific oids (overrideHaves)
 */
export const httpWithLazyInjection = (http: any, config: { 
	noneBlobFilter: boolean, 
	overrideHaves?: string[] | undefined, 
	overrideWants: string[] | undefined}) => {
	
	return new Proxy(http, {
		get(getTarget: typeof http, prop, receiver) {
			if (prop === 'request' && getTarget[prop as keyof typeof http]) {
				return new Proxy(getTarget[prop as keyof typeof getTarget], {
					apply(callTarget, thisArg, argumentsList) {

						const options = argumentsList[0];

						if (options.body) {
         
							// decode the lines to be able to change them
							let rawLines = decodeBuffer(options.body);
							
							if (config.noneBlobFilter) {
								rawLines = addBlobNoneFilter(rawLines);
							}
					
							if (config.overrideHaves) {
								rawLines = overrideHaves(rawLines, config.overrideHaves)
							}

							if (config.overrideWants) {
								rawLines = addWantsCapabilities(rawLines);
								rawLines = overrideWants(rawLines, config.overrideWants)
							}

							// encode lines again to send them in a request
							options.body = rawLines.map((updatedRawLine) => encodePkLine(updatedRawLine));
						}
						
						
						return Reflect.apply(callTarget, thisArg, argumentsList);
					},
				})
			}

			return Reflect.get(http, prop, receiver)
		},
	})
}