import { describe, it, expect } from 'vitest'
import type { TFile } from 'obsidian'
import { groupFilter } from 'src/obsidian/timeline/settings/groups/grouping'
import { queryContract } from '../query'

describe(`Grouping files by path`, () => {

    function group(files: Pick<TFile, 'path'>[], query: string) {
        const filter = groupFilter(query)
        return files.filter(file => filter.appliesTo(file as any)).map(file => file.path)
    }

    const allFiles: Pick<TFile, 'path'>[] = [
        { path: 'file1.txt' },
        { path: 'work/meeting.md' },
        { path: 'work/meetup.md' },
        { path: 'personal/meeting.md' },
        { path: 'personal/meetup.md' },
        { path: 'work/report.md' },
        { path: 'complaints/work.md' },
        { path: 'math/workings.md' },
    ];

    describe(`empty query`, () => {

        it(`matches nothing`, () => {
            expect(group(allFiles, "")).toEqual([])
        })

    })

    queryContract(group)

})