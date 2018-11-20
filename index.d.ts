import { Options } from 'xml2js';

interface Headers
{
    readonly Accept: string;
    readonly 'User-Agent': string;
}

interface CustomFields
{
    readonly feed?: string[];
    readonly item?: string[] | string[][];
}

interface ParserOptions
{
    readonly xml2js?: Options;
    readonly headers?: Headers;
    readonly defaultRSS?: number;
    readonly maxRedirects?: number;
    readonly customFields?: CustomFields;
}

interface Items
{
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

interface Output
{
    readonly link: string;
    readonly title: string;
    readonly items: Items[];
    readonly feedUrl: string;
    readonly description: string;
    readonly itunes: {
        image: string;
        owner: {
            name: string;
            email: string;
        };
        author: string;
        summary: string;
        explicit: string;
    };
}

/**
 * Class that handles all parsing or URL, or even XML, RSS feed to JSON.
 */
declare const Parser: {
    /**
     * @param options - Parser options.
     */
    new(options?: ParserOptions): {
        /**
       * Parse XML content to JSON.
       * 
       * @param xml - The xml to be parsed.
       * @param callback - Traditional callback.
       * 
       * @returns Promise that has the same Output as the callback.
       */
        parseString(xml: string, callback?: (err: Error, feed: Output) => void): Promise<Output>;

        /**
         * Parse URL content to JSON.
         *
         * @param feedUrl - The url that needs to be parsed to JSON.
         * @param callback - Traditional callback.
         * @param redirectCount - Max of redirects, default is set to five.
         *
         * @example
         * await parseURL('https://www.reddit.com/.rss');
         * parseURL('https://www.reddit.com/.rss', (err, feed) => { ... });
         *
         * @returns Promise that has the same Output as the callback.
         */
        parseURL(feedUrl: string, callback?: (err: Error, feed: Output) => void, redirectCount?: number): Promise<Output>;
    };
}
export = Parser
