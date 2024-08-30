//eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONType = Record<string, any>;

/**
 * Property object available in active object as active[name] when the Route matches.
 */
export type RouteParams = {
    /** Name of the route */
    name: string,

    /** Current full URL which was matched on */
    location: string,

    /** Extracted arguments from match regex */
    args: string[],

    /** Extracted object from search params in hash-part of the url */
    search: JSONType,
};

/**
 * Configuration of a Route.
 */
export type RouteConfig = {
    /**
     * matched against the hash part of the URL using standard javascript string.match().
     * All matched groups are available as router.active[name].args[].
     */
    match: string,

    /**
     * Inverse of match, if the URL matches then the route is ignored even if match is positive.
     * Can be useful for routes who may overlap in their URLs but should not be active simultaneously.
     */
    nomatch?: string,

    /**
     * Absolute or relative URL to push for this route.
     * This URL is pushed as it is with or without hash, can also be to other domain.
     * pushURL is uncoupled with match field, and is not required to match it.
     */
    pushURL?: string,

    /**
     * When a route matched also the given group is set as active, just as if it was matched.
     */
    group?: string,

    /**
     * When registering routes in sub components this field can be set which then requires
     * that at least one route with the same subGroup (can be same) is matched and active,
     * or else the fallback is invoked.
     *
     * This is useful for catching bad URLs where sub modules are registering their own routes.
     *
     * If base is set then subGroup is only applicable if base matches.
     */
    subGroup?: string,

    /**
     * The base of the URL hash to match.
     * The hash part of the URL is required to begin with the value of base before continuing to match.
     * Default is "".
     */
    base?: string,

    /**
     * If set then upon match immediately replace the URL with the route given by
     * this field and run the match again.
     */
    reroute?: string,

    /**
     * If any matched route has requireAuth set then pass second argument to onPreRoute as true.
     * This is of conveniece so that the onPreRoute function does not have to check every
     * active route if it requires auth.
     */
    requireAuth?: boolean,
};

export type Routes = {[name: string]: RouteConfig};

export type ActiveRoutes = {[name: string]: RouteParams};
