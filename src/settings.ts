import obsidian from "obsidian";
import type * as property from "src/note/property";
import TimelineNoteSorterPropertySelect from "./timeline/sorting/TimelineNoteSorterPropertySelect.svelte";
import { expectArray, expectBoolean, expectObject, expectString, type Parsed } from "src/utils/json";
import { TimelineNoteSorterSelector } from "src/timeline/sorting/TimelineNoteSorterSelector";
import TimelineQueryFilterInput from "src/timeline/filter/TimelineQueryFilterInput.svelte";
import { TimelineItemQueryFilter } from "src/timeline/filter/TimelineItemQueryFilter";
import * as note from "src/note";
import Groups from "src/timeline/group/TimelineGroupsList.svelte";
import { TimelineGroups } from "src/timeline/group/groups";
import { TimelineGroup } from "src/timeline/group/group";
import { mount } from "svelte";

export class ObsidianSettingsTab extends obsidian.PluginSettingTab {
	#plugin;
	#noteProperties;
	#notes;

	constructor(
		app: obsidian.App,
		plugin: obsidian.Plugin,
		noteProperties: property.ObsidianRepository,
		notes: note.ObsidianRepository,
	) {
		super(app, plugin);
		this.#plugin = plugin;
		this.#noteProperties = noteProperties;
		this.#notes = notes;
	}

	#loadedSettings: TimelineSettingsJSON | undefined;
	async #getSettings() {
		if (!this.#loadedSettings) {
			this.#loadedSettings = sanitizeTimelineSettings(await this.#plugin.loadData());
		}
		return this.#loadedSettings;
	}

	async #updateSettings(updater: (settings: TimelineSettingsJSON) => void) {
		const settings = await this.#getSettings();
		updater(settings);
		this.#plugin.saveData(settings);
	}

	async noteOrder(): Promise<TimelineNoteSorterSelector> {
		const loadedSettings = await this.#getSettings();
		return await TimelineNoteSorterSelector.sanitize(
			loadedSettings.openWith.property,
			this.#noteProperties,
			async (name) => {
				this.#updateSettings((settings) => (settings.openWith.property = name));
			},
		);
	}

	async noteFilter(query?: string): Promise<TimelineItemQueryFilter> {
		const loadedSettings = await this.#getSettings();
		const filterQuery = query ?? loadedSettings.openWith.filter.query;
		return new TimelineItemQueryFilter(this.#notes, filterQuery, async (query) => {
			this.#updateSettings((settings) => (settings.openWith.filter.query = query));
		});
	}

	async groups(): Promise<TimelineGroups> {
		const loadedSettings = await this.#getSettings();

		const updateGroups = () => {
			this.#updateSettings((settings) => {
				settings.openWith.groups = groups.groups().map((g) => {
					return {
						query: g.query(),
						color: g.color(),
					};
				});
			});
		};

		const makeGroup = (query: string, color: string) => {
			const group = new TimelineGroup(this.#notes, query, color);
			group.onChanged = updateGroups;
			return group;
		};

		const groups = new TimelineGroups(
			loadedSettings.openWith.groups.map(({ query, color }) => makeGroup(query, color)),
			(color) => makeGroup("", color),
		);
		groups.onChanged = updateGroups;

		return groups;
	}

	usePreviousState(): boolean {
		return this.#loadedSettings?.openWith?.previousState ?? false;
	}

	async display() {
		const containerEl = this.containerEl;

		const order = await this.noteOrder();
		const filter = await this.noteFilter();
		const groups = await this.groups();

		new obsidian.Setting(containerEl)
			.setName("Ribbon Re-opens Timeline")
			.setDesc(
				"When clicking the ribbon icon, should it attempt to re-open the previously closed timeline?  This is not persisted across obsidian restarts.",
			)
			.addToggle((toggle) => {
				toggle.setValue(this.usePreviousState()).onChange((value) => {
					this.#updateSettings((settings) => (settings.openWith.previousState = value));
				});
			});

		new obsidian.Setting(containerEl).setName("Defaults").setClass("setting-item-heading");

		const propertySetting = new obsidian.Setting(containerEl)
			.setName("Default Ordering Property")
			.setDesc("The default property to use for ordering notes in the timeline when it's first opened.");
		mount(TimelineNoteSorterPropertySelect, {
			target: propertySetting.controlEl,
			props: {
				order,
				tabindex: 0,
				onSelected(property) {
					order.selectProperty(property);
				},
			},
		});

		const filterSetting = new obsidian.Setting(containerEl)
			.setName("Default Filter")
			.setDesc("The default filter to use for notes in the timeline when it's first opened.");
		mount(TimelineQueryFilterInput, {
			target: filterSetting.controlEl,
			props: {
				filter,
			},
		});

		new obsidian.Setting(containerEl)
			.setName("Default Groups")
			.setDesc("The default set of groups to use in the timeline when it's first opened.");

		mount(Groups, {
			target: new obsidian.Setting(containerEl).controlEl,
			props: {
				groups,
			},
		});
	}

	hide() {
		this.containerEl.empty();
		super.hide();
	}
}

function sanitizeTimelineSettings(data: unknown): TimelineSettingsJSON {
	return timelineSettingsSchema().parseOrDefault(data);
}

function timelineSettingsSchema() {
	return expectObject({
		openWith: expectObject({
			property: expectString("created"),
			filter: expectObject({
				query: expectString(""),
			}),
			groups: expectArray(
				expectObject({
					query: expectString(""),
					color: expectString(""),
				}),
			),
			previousState: expectBoolean(false),
		}),
	});
}

export type TimelineSettingsJSON = Parsed<ReturnType<typeof timelineSettingsSchema>>;
