import * as obsidian from "obsidian";
import type {ObsidianNotePropertyRepository} from "src/note/property/obsidian-repository";
import TimelineNoteSorterPropertySelect from "../../timeline/sorting/TimelineNoteSorterPropertySelect.svelte";
import {expectArray, expectBoolean, expectObject, expectString, expectEnum, type Parsed} from "src/utils/json";
import {TimelineNoteSorterSelector} from "src/timeline/sorting/TimelineNoteSorterSelector.svelte";
import TimelineQueryFilterInput from "src/timeline/filter/TimelineQueryFilterInput.svelte";
import {TimelineItemQueryFilter} from "src/timeline/filter/TimelineItemQueryFilter";
import type {ObsidianNoteRepository} from "src/note/obsidian-repository";
import Groups from "src/timeline/group/TimelineGroupsList.svelte";
import {TimelineGroups} from "src/timeline/group/groups";
import {TimelineGroup} from "src/timeline/group/group";
import {mount} from "svelte";
import {TimelineNoteSorterPropertyType} from "src/timeline/sorting/TimelineNoteSorterProperty";

export class ObsidianSettingsTimelineTab extends obsidian.PluginSettingTab {
	#plugin;
	#noteProperties;
	#notes;

	constructor(
		app: obsidian.App,
		plugin: obsidian.Plugin,
		noteProperties: ObsidianNotePropertyRepository,
		notes: ObsidianNoteRepository,
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
			loadedSettings.openWith.secondaryProperty.name,
			loadedSettings.openWith.secondaryProperty.inUse,
			this.#noteProperties,
			async name => {
				this.#updateSettings(settings => (settings.openWith.property = name));
			},
			async secondaryName => {
				this.#updateSettings(settings => (settings.openWith.secondaryProperty.name = secondaryName));
			},
			async useSecondary => {
				this.#updateSettings(settings => (settings.openWith.secondaryProperty.inUse = useSecondary));
			},
		);
	}

	async noteLength() {
		const loadedSettings = await this.#getSettings();
		return {
			propertyName: loadedSettings.openWith.secondaryProperty.name,
			use: loadedSettings.openWith.secondaryProperty.inUse,
			useAs: loadedSettings.openWith.secondaryProperty.useAs,
		};
	}

	async noteFilter(): Promise<TimelineItemQueryFilter> {
		const loadedSettings = await this.#getSettings();
		return new TimelineItemQueryFilter(this.#notes, loadedSettings.openWith.filter.query, async query => {
			this.#updateSettings(settings => (settings.openWith.filter.query = query));
		});
	}

	async groups(): Promise<TimelineGroups> {
		const loadedSettings = await this.#getSettings();

		const updateGroups = () => {
			this.#updateSettings(settings => {
				settings.openWith.groups = groups.groups().map(g => {
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
			loadedSettings.openWith.groups.map(({query, color}) => makeGroup(query, color)),
			color => makeGroup("", color),
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
		const length = await this.noteLength();
		const filter = await this.noteFilter();
		const groups = await this.groups();

		new obsidian.Setting(containerEl)
			.setName("Ribbon Re-opens Timeline")
			.setDesc(
				"When clicking the ribbon icon, should it attempt to re-open the previously closed timeline?  This is not persisted across obsidian restarts.",
			)
			.addToggle(toggle => {
				toggle.setValue(this.usePreviousState()).onChange(value => {
					this.#updateSettings(settings => (settings.openWith.previousState = value));
				});
			});

		new obsidian.Setting(containerEl).setName("Defaults").setClass("setting-item-heading");

		const propertyDescription = new DocumentFragment();
		propertyDescription.createSpan("", span => {
			span.innerText = "The default property to use for ordering notes in the timeline when it's first opened.";
		});
		const propertyWarnings = [
			propertyDescription.createSpan("", span => {
				span.addClass("mod-warning");
				span.innerText =
					"\nThe selected properties are of different types and may result in nonsensical behaviour.";
			}),
		];

		function checkPropertyTypes() {
			if (
				(order.selectedProperty().type() === TimelineNoteSorterPropertyType.Number &&
					order.secondaryProperty().type() !== TimelineNoteSorterPropertyType.Number) ||
				(order.selectedProperty().type() !== TimelineNoteSorterPropertyType.Number &&
					order.secondaryProperty().type() === TimelineNoteSorterPropertyType.Number)
			) {
				propertyWarnings.forEach(it => it.show());
			} else {
				propertyWarnings.forEach(it => it.hide());
			}
		}

		const propertySetting = new obsidian.Setting(containerEl)
			.setName("Default Ordering Property")
			.setDesc(propertyDescription);
		mount(TimelineNoteSorterPropertySelect, {
			target: propertySetting.controlEl,
			props: {
				property: order.selectedProperty(),
				getProperties: () => order.availableProperties(),
				tabindex: 0,
			},
			events: {
				selected: event => {
					order.selectProperty(event.detail);
					checkPropertyTypes();
				},
			},
		});

		new obsidian.Setting(containerEl)
			.setName("Use Secondary Property")
			.setDesc("Should a secondary property be used by default when the timeline is first opened?")
			.addToggle(toggle => {
				toggle.setValue(order.secondaryPropertyInUse());
				toggle.onChange(value => {
					order.toggleSecondaryProperty(value);
					this.#updateSettings(settings => (settings.openWith.secondaryProperty.inUse = value));
				});
			});

		const secondaryPropertyDesc = new DocumentFragment();
		secondaryPropertyDesc.createSpan("", span => {
			span.innerText = "The default property to use as the secondary property when the timeline is first opened.";
		});
		propertyWarnings.push(
			secondaryPropertyDesc.createSpan("", span => {
				span.addClass("mod-warning");
				span.innerText =
					"\nThe selected properties are of different types and may result in nonsensical behaviour.";
			}),
		);

		const secondaryPropertySetting = new obsidian.Setting(containerEl)
			.setName("Default Secondary Property")
			.setDesc(secondaryPropertyDesc);

		mount(TimelineNoteSorterPropertySelect, {
			target: secondaryPropertySetting.controlEl,
			props: {
				property: order.secondaryProperty(),
				getProperties: () => order.availableProperties(),
				tabindex: 0,
			},
			events: {
				selected: event => {
					order.selectSecondaryProperty(event.detail);
					checkPropertyTypes();
				},
			},
		});
		checkPropertyTypes();

		new obsidian.Setting(containerEl)
			.setName("Interpret Secondary Property As")
			.setDesc("By default, how should the secondary property be interpreted?")
			.addDropdown(dropdown => {
				dropdown.addOption("length", "Length");
				dropdown.addOption("end", "End");
				dropdown.setValue(length.useAs);
				dropdown.onChange(value => {
					length.useAs = value as "length" | "end";
					this.#updateSettings(
						settings => (settings.openWith.secondaryProperty.useAs = value as "length" | "end"),
					);
				});
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
			secondaryProperty: expectObject({
				name: expectString("modified"),
				inUse: expectBoolean(false),
				useAs: expectEnum({length: "length" as const, end: "end" as const}, "end"),
			}),
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
