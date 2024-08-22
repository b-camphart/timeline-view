export interface QueryReader {
	query(): string;
}

export interface QueryFilterWriter {
	filterByQuery(query: string): void;
}

export interface QueryFilterReaderWriter
	extends QueryReader,
		QueryFilterWriter {}
