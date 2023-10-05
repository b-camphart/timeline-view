import { type FileFilter, matchAllFilters } from "./FileFilter";
import { filterByPath } from "./path";

export function parseFileSearchQuery(query: string) {
    query = query.trim()
    const filters: FileFilter[] = [];

    let parser: Parser = DefaultParser;
    for (const char of query) {
        parser = parser.parseCharacter(char, filters)
    }
    parser.end(filters);

    return filters;

}

interface Parser {
    parseCharacter(char: string, filters: FileFilter[]): Parser;
    end(filters: FileFilter[]): void;
}

const DefaultParser: Parser = {

    parseCharacter(char: string, filters: FileFilter[]) {
        if (char === " ") {
            return this;
        }
        if (char === '"') {
            return new PhraseParser();
        }
        if (char === "-") {
            return new NegatedParser();
        }
        if (char === "(") {
            return new GroupedParser();
        }
        return new WordParser(char)
    },

    end(filters: FileFilter[]) { }
}

class WordParser implements Parser {

    constructor(private buffer: string) { }

    parseCharacter(char: string, filters: FileFilter[]) {
        if (char === " ") {
            filters.push(filterByPath(this.buffer))
            return DefaultParser;
        }
        this.buffer += char
        return this;
    }

    end(filters: FileFilter[]) {
        filters.push(filterByPath(this.buffer))
    }

}

class PhraseParser implements Parser {

    private buffer: string;
    private escaped: boolean;

    constructor() {
        this.buffer = "";
        this.escaped = false;
    }

    parseCharacter(char: string, filters: FileFilter[]) {
        if (this.escaped) {
            this.buffer += char;
            this.escaped = false;
        } else if (char === '\\') {
            this.escaped = true;
        } else if (char === '"') {
            filters.push(filterByPath(this.buffer))
            return DefaultParser;
        } else {
            this.buffer += char;
        }
        return this;
    }

    end(filters: FileFilter[]) {
        filters.push(filterByPath(this.buffer));
    }

}

class NegatedParser implements Parser {

    private internalParser: Parser;
    private negatedFilters: FileFilter[] = [];

    constructor() {
        this.internalParser = DefaultParser;
    }

    parseCharacter(char: string, filters: FileFilter[]) {
        this.internalParser = this.internalParser.parseCharacter(char, this.negatedFilters);
        if (this.internalParser === DefaultParser) {
            filters.push(negated(this.negatedFilters))
            return this.internalParser;
        }
        return this;
    }

    end(filters: FileFilter[]) {
        filters.push(negated(this.negatedFilters));
    }

}

class GroupedParser implements Parser {

    private internalParser: Parser;
    private groupedFilters: FileFilter[] = [];
  
    constructor() {
        this.internalParser = DefaultParser;
    }

    parseCharacter(char: string, filters: FileFilter[]): Parser {
        if (char === ")" && !(this.internalParser instanceof GroupedParser)) {
            this.internalParser.end(this.groupedFilters);
            filters.push(matchAllFilters(this.groupedFilters))
            return DefaultParser;
        }
        this.internalParser = this.internalParser.parseCharacter(char, this.groupedFilters)
        return this;
    }

    end(filters: FileFilter[]): void {
        this.internalParser.end(this.groupedFilters);
        filters.push(matchAllFilters(this.groupedFilters))
    }
}


function negated(filters: FileFilter[]): FileFilter {
    return {
        appliesTo(file) {
            return filters.every(filter => !filter.appliesTo(file))
        },
    }
}