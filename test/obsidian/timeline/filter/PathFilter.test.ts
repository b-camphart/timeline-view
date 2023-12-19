import { describe, it, expect } from 'vitest'
import type { TFile } from 'obsidian'
import { parseFileSearchQuery } from 'src/obsidian/timeline/filter/parser'
import { queryContract } from '../query'

describe(`Filtering files by path`, () => {

    function filter(files: Pick<TFile, 'path'>[], query: string) {
        const filter = parseFileSearchQuery(query)
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

        it(`matches everything`, () => {
            expect(filter(allFiles, "")).toEqual(allFiles.map(file => file.path))
        })

    })

    queryContract(filter)

})