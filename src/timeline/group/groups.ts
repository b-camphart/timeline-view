import {TimelineGroup} from "src/timeline/group/group";

const defaultGroupColors = [
	"#e05252",
	"#e0b152",
	"#b1e052",
	"#52e052",
	"#52e0b1",
	"#52b1e0",
	"#5252e0",
	"#b152e0",
	"#e052b1",
];

export class TimelineGroups {
	private _groups: TimelineGroup[];

	constructor(
		groups: readonly TimelineGroup[],
		private createGroup: (color: string) => TimelineGroup,
	) {
		this._groups = groups.slice();
	}

	groups(): readonly TimelineGroup[] {
		return this._groups;
	}

	appendNewGroup() {
		const group = this.createGroup(
			defaultGroupColors[this._groups.length % defaultGroupColors.length],
		);
		this._groups.push(group);
		this.onChanged();
		return group;
	}

	removeGroup(index: number) {
		const removed = this._groups.splice(index, 1);
		console.log(
			"removed",
			index,
			"with",
			removed[0].color(),
			removed[0].query(),
		);
		this.onChanged();
		return removed[0];
	}

	moveGroup(from: number, to: number) {
		if (from === to) return null;
		const removed = this._groups.splice(from, 1);
		this._groups.splice(to, 0, removed[0]);
		this.onChanged();
		return removed[0];
	}

	onChanged() {}
}
