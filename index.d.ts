declare module 'rss-parser' {
    import { Options } from 'xml2js';

    export interface Headers {
        readonly Accept: string;
        readonly 'User-Agent': string;
    }

    export interface CustomFields {
        readonly feed?: string[];
        readonly item?: string[] | string[][];
    }

    export interface ParserOptions {
        readonly xml2js?: Options;
        readonly headers?: Headers;
        readonly defaultRSS?: number;
        readonly maxRedirects?: number;
        readonly customFields?: CustomFields;
    }

    export interface Items {
        readonly link: string;
        readonly guid: string;
        readonly title: string;
        readonly pubDate: string;
        readonly creator: string;
        readonly content: string;
        readonly isoDate: string;
        readonly categories: string[];
        readonly contentSnippet: string;
    }

    export interface Output {
        readonly link: string;
        readonly title: string;
        readonly items: Items[];
        readonly feedUrl: string;
        readonly description: string;
    }

    /**
     * Class that handles all parsing or URL, or even XML, RSS feed to JSON.
     */
    export default class Parser {
        /**
         * @param options Parser options;
         * @returns Parser;
         */
        constructor(options?: ParserOptions);

        /**
         * Parse XML content to JSON.
         * 
         * @param xml The xml to be parsed.
         * @param callback Traditional callback.
         * @returns Promise that has the same Output as the callback.
         */
        public parseString(xml: string, callback?: (err: Error, feed: Output) => void): Promise<Output>;

        /**
         * Parse URL content to JSON.
         *
         * @param feedUrl The url that needs to be parsed to JSON.
         * @param callback Traditional callback.
         * @param redirectCount Max of redirects, default is set to five.
         * @returns Promise that has the same Output as the callback.
         */
        public parseURL(feedUrl: string, callback?: (err: Error, feed: Output) => void, redirectCount?: number): Promise<Output>;

        /**
         * Add iTunes specific fields from XML to extracted JSON
         * 
         * @param feed extracted
         * @param channel parsed XML
         */
        public decorateItunes(feed: Output, channel: Output);
    }
}
