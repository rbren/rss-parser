import { Options } from 'xml2js';

declare namespace Parser {
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

  export interface Item {
    [key: string]: any;
    link?: string;
    guid?: string;
    title?: string;
    pubDate?: string;
    creator?: string;
    content?: string;
    isoDate?: string;
    categories?: string[];
    contentSnippet?: string;
  }

  export interface Output {
    [key: string]: any;
    link?: string;
    title?: string;
    items?: Item[];
    feedUrl?: string;
    description?: string;
    itunes?: {
      [key: string]: any;
      image?: string;
      owner?: {
        name?: string;
        email?: string;
      };
      author?: string;
      summary?: string;
      explicit?: string;
    };
  }
}

/**
 * Class that handles all parsing or URL, or even XML, RSS feed to JSON.
 */
declare class Parser {
  /**
   * @param options - Parser options.
   */
  constructor(options?: Parser.ParserOptions);
  /**
   * Parse XML content to JSON.
   *
   * @param xml - The xml to be parsed.
   * @param callback - Traditional callback.
   *
   * @returns Promise that has the same Output as the callback.
   */
  parseString(
    xml: string,
    callback?: (err: Error, feed: Parser.Output) => void
  ): Promise<Parser.Output>;

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
  parseURL(
    feedUrl: string,
    callback?: (err: Error, feed: Parser.Output) => void,
    redirectCount?: number
  ): Promise<Parser.Output>;
}

export = Parser;
