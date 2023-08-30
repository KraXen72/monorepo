import { useEditorState } from "../State.jsx"
import { For, Show } from "solid-js"
import { showFilteredMessage } from "./../helper/showFilteredMessage.js"
import { TourHintWrapper } from "./Notification/TourHintWrapper.jsx"
import IconArrowLeft from "~icons/material-symbols/arrow-back-rounded"
import type { LintRule, MessageLintReport } from "@inlang/app"

interface ListHeaderProps {
	ids: string[]
}

type RuleSummaryItem = {
	rule: LintRule["meta"]
	amount: number
	level: "error" | "warning"
}

export const messageCount = (ids: string[]) => {
	const { inlang } = useEditorState()
	let counter = 0
	for (const id of ids) {
		if (showFilteredMessage(inlang()?.query.messages.get({ where: { id: id } }))) counter++
	}
	return counter
}

export const ListHeader = (props: ListHeaderProps) => {
	const {
		inlang,
		setFilteredLintRules,
		filteredLintRules,
		filteredId,
		setFilteredId,
		setTourStep,
		tourStep,
	} = useEditorState()

	const getLintSummary = () => {
		const lintSummary: Array<RuleSummaryItem> = []
		const reports = inlang()?.query.lintReports.getAll()
		inlang()
			?.installed.lintRules()
			.filter((lintRule) => !lintRule.disabled)
			.map((lintRule) => {
				let level: "error" | "warning"
				const filteredReports = reports?.filter(
					(report: MessageLintReport) => report.ruleId === lintRule.meta.id,
				)
				let counter = 0
				filteredReports?.filter((report: MessageLintReport) => {
					level = report.level
					if (
						showFilteredMessage(inlang()?.query.messages.get({ where: { id: report.messageId } }))
					) {
						counter++
					}
				})

				if (
					lintRule &&
					counter !== 0 &&
					(filteredLintRules().length === 0 || filteredLintRules().includes(lintRule.meta.id))
				) {
					lintSummary.push({ rule: lintRule.meta, amount: counter, level: level! })
				}
			})

		return lintSummary
	}

	return (
		<div class="h-14 w-full bg-background border border-surface-3 rounded-t-md flex items-center px-4 justify-between">
			<Show
				when={filteredId() === ""}
				fallback={
					<div class="flex gap-2 items-center">
						<sl-button prop:size="small" onClick={() => setFilteredId("")}>
							{/* @ts-ignore */}
							<IconArrowLeft slot="prefix" />
							Back to all messages
						</sl-button>
						<div class="h-[30px] px-3 flex gap-2 font-medium items-center rounded-md text-xs bg-hover-primary/10 text-primary">
							Isolated view (single ID)
						</div>
					</div>
				}
			>
				<div class="font-medium text-on-surface">{messageCount(props.ids) + " Messages"}</div>
			</Show>

			<div class="flex gap-2">
				<For each={getLintSummary()}>
					{(lintRule) => (
						<Show when={lintRule.amount !== 0}>
							<TourHintWrapper
								currentId="missing-message-rule"
								position="bottom-right"
								offset={{ x: 0, y: 40 }}
								isVisible={
									lintRule.rule.id === "inlang.lintRule.missingTranslation" &&
									tourStep() === "missing-message-rule"
								}
							>
								<sl-tooltip
									prop:content={lintRule.rule.description["en"]}
									prop:placement="bottom"
									prop:trigger="hover"
									class="small"
									style={{ "--show-delay": "1s" }}
								>
									<sl-button
										prop:size="small"
										class={
											filteredLintRules()?.includes(lintRule.rule.id || "")
												? lintRule.level === "warning"
													? "ring-warning/20 ring-1 rounded"
													: "ring-danger/20 ring-1 rounded"
												: ""
										}
										onClick={() => {
											if (filteredLintRules().includes(lintRule.rule.id)) {
												setFilteredLintRules(
													filteredLintRules().filter((id) => id !== lintRule.rule.id),
												)
											} else {
												setFilteredLintRules([lintRule.rule.id])
												setTourStep("textfield")
											}
										}}
									>
										<div
											class="flex gap-2 items-center h-7"
											id={
												lintRule.rule.id === "inlang.lintRule.missingTranslation"
													? "missingTranslation-summary"
													: "lint-summary"
											}
										>
											<div class="-ml-[4px] h-5 rounded">
												<div
													class={
														lintRule.level === "warning"
															? " text-focus-warning bg-warning/20 h-full px-2 rounded flex items-center justify-center"
															: "text-focus-danger bg-danger/20 h-full px-2 rounded flex items-center justify-center"
													}
												>
													{lintRule.amount}
												</div>
											</div>

											<div class="text-xs text-on-surface-variant font-medium">
												{lintRule.rule.displayName["en"]}
												{/* TODO: Show tooltip with description on hover */}
											</div>
										</div>
									</sl-button>
								</sl-tooltip>
							</TourHintWrapper>
						</Show>
					)}
				</For>
			</div>
		</div>
	)
}
