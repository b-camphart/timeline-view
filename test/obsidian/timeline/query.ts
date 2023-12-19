import { describe, it, expect } from "vitest"
import type { TFile } from 'obsidian'


export function queryContract(query: (files: Pick<TFile, 'path'>[], query: string) => string[]) {
    describe(`single word`, () => {

        const word = "work"
        const files = [
            { path: `work.md` },
            { path: `work/meeting.md` },
            { path: `personal/meeting.md` },
            { path: 'complaints/work.md' },
            { path: 'math/workings.md' },
        ]

        it(`matches files containing the word in their path`, () => {
            expect(query(files, word)).toEqual([
                `work.md`,
                `work/meeting.md`,
                'complaints/work.md',
                'math/workings.md'
            ])
        })

        describe(`negated`, () => {

            it(`matches files NOT containing the word in their path`, () => {
                expect(query(files, `-${word}`)).toEqual([
                    `personal/meeting.md`
                ])
            })

        })

    })

    describe(`two words`, () => {

        const words = [`meeting`, `work`]
        const files = [
            { path: `work.md` },
            { path: `work/meeting.md` },
            { path: `personal/meeting.md` },
            { path: `personal/meetup.md` },
            { path: 'complaints/work.md' },
            { path: 'math/workings.md' },
        ]

        it(`matches files that contain BOTH words`, () => {
            expect(query(files, `${words[0]} ${words[1]}`)).toEqual([
                'work/meeting.md',
            ])
        })

        describe(`OR'd`, () => {

            it(`matches files that contain EITHER word`, () => {
                const result = query(files, `${words[0]} OR ${words[1]}`);
                expect(result).toEqual([
                    `work.md`,
                    'work/meeting.md',
                    'personal/meeting.md',
                    `complaints/work.md`,
                    `math/workings.md`,
                ]);
            })

        })

        describe(`one is negated`, () => {

            it(`matches files that contain the first, but NOT the second word`, () => {
                const result = query(files, `${words[0]} -${words[1]}`);
                expect(result).toEqual([
                    'personal/meeting.md',
                ]);
            })

        })

    })

    describe(`two words OR two words`, () => {

        const words = [[`meeting`, `work`], ['meetup', 'personal']]
        const files = [
            { path: `work/meeting.md` },
            { path: `work/meetup.md` },
            { path: `personal/meeting.md` },
            { path: `personal/meetup.md` },
            { path: `personal/meetings/workings.md` },
        ]

        it(`matches files containing BOTH first words OR BOTH second words`, () => {
            const result = query(files, `${words[0][0]} ${words[0][1]} OR ${words[1][0]} ${words[1][1]}`);
            expect(result).toEqual([
                'work/meeting.md',
                'personal/meetup.md',
                `personal/meetings/workings.md`
            ]);
        })

        describe(`word (word OR word) word`, () => {

            it(`matches files containing the first word, last word, and the EITHER of the two grouped words`, () => {
                const result = query(files, `${words[0][0]} (${words[0][1]} OR ${words[1][0]}) ${words[1][1]}`);
                expect(result).toEqual([
                    `personal/meetings/workings.md`
                ]);

            })

        })

    })

    describe(`exact phrase in quotes`, () => {

        const phrase = "star wars";
        const files = [
            { path: 'star wars.md' },
            { path: 'star wars/meeting notes.md' },
            { path: 'personal/star wars fanfic.md' },
            { path: 'star wars and trek.md' },
            { path: 'star other wars.md' },
        ];
    
        it(`matches files containing the exact phrase "star wars"`, () => {
            const result = query(files, `"${phrase}"`);
            expect(result).toEqual([
                'star wars.md', 
                'star wars/meeting notes.md',
                'personal/star wars fanfic.md',
                'star wars and trek.md',
            ]);
        });
    
        describe(`negated`, () => {
    
            it(`matches files NOT containing the exact phrase "star wars"`, () => {
                const result = query(files, `-"${phrase}"`);
                expect(result).toEqual([
                    'star other wars.md'
                ]);
            });
    
        });
    
        describe(`escaped quotes`, () => {
        
            const phrase = '\\"hello\\" world';
            const files = [
                { path: 'hello world.md' },
                { path: '"hello world".md' },
                { path: '"hello" world.md' },
            ];
        
            it(`matches files containing the exact phrase with escaped quotes`, () => {
                const result = query(files, `"${phrase}"`);
                expect(result).toEqual(['"hello" world.md']);
            });
        
        });
    
    });
    
    describe(`multiple negations`, () => {
    
        const words = ['meeting', 'work', 'personal'];
        const files = [
            { path: 'work meeting.md' },
            { path: 'personal notes.md' },
            { path: 'complaints/work.md' },
            { path: 'math/meetings.md' },
            { path: 'coding/workshop.md' },
        ];
    
        it(`matches files containing first words but not either of the last two`, () => {
            const result = query(files, `${words[0]} -${words[1]} -${words[2]}`);
            expect(result).toEqual([`math/meetings.md`]);
        });
    
    });
    
    describe(`complex expressions`, () => {
    
        const files = [
            { path: 'work meeting.md' },
            { path: 'work meetup.md' },
            { path: 'star wars.md' },
            { path: 'personal/star wars.md' },
            { path: 'personal meeting.md' },
            { path: 'personal meetup.md' },
            { path: 'work meeting personal.md' },
            { path: 'work meetup personal.md' },
        ];
    
        it(`matches files with complex expressions`, () => {
            const result = query(files, 'work (meeting OR meetup) -personal OR "star wars"');
            expect(result).toEqual([
                'work meeting.md',
                'work meetup.md',
                'star wars.md',
                'personal/star wars.md',
            ]);
        });
    
    });
}