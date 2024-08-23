import {
    ActiveRoutes,
    Routes,
    RouteParams,
    RouteConfig,
} from "./types";

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONType = Record<string, any>;

export class Router {
    protected routes: Routes = {};
    protected redirectFn?: (url: string) => void;
    protected replaceFn?: (url: string) => void;
    protected preRouteFn?: (active: ActiveRoutes) => (boolean | undefined);
    protected fallbackFn?: (url: string) => boolean | undefined;
    protected updateFn?: () => void;

    /** The current location of the Router. */
    protected location: string = "";

    /**
     * All matched routes are exposed in this public object.
     */
    public active: ActiveRoutes = {};

    /**
     * @param update callback function when an update of the UI is needed.
     * @param window if available pass in the window object to auto config the Router.
     */
    constructor(window?: Window) {
        if (window) {
            this.onRedirect( (url) => window.location.href = url );

            this.onReplace( (url) => window.history.replaceState(null, "", url) );

            window.addEventListener("hashchange", () => this.updateLocation(window.location.href) );

            this.updateLocation(window.location.href);
        }
    }

    /**
     * Event callback for when a match has been performed and an update is due.
     * Note that this event is possibly fired from within a life cycle event handler,
     * so do not directly call component.update(), instead wrap that in a setImmediate call.
     */
    public onUpdate( updateFn: () => void) {
        this.updateFn = updateFn;
    }

    /**
     * Call this from the outside each time the location changes.
     * @param location full URL as given for example by window.location.href
     */
    public updateLocation(location: string) {
        this.location = location;

        this.match();
    }

    /**
     * Rerun the matching process to refresh the state.
     * Can be useful when onPreRoute needs to be reevaluated
     * for the given URL.
     */
    public refresh() {
        this.match();
    }

    /**
     * Register routes.
     * match is performed automatically.
     */
    public register(routes: Routes) {
        this.routes = {...this.routes, ...routes};

        this.match();
    }

    /**
     * Remove routes by name.
     * A match is NOT performed automatically after unregistering.
     */
    public unregister(routes: Routes) {
        Object.keys(routes).forEach( name => delete this.routes[name] );
    }

    /**
     * Redirect to URL given by route name.
     *
     * @throws if route does not exist or pushURL not set.
     */
    public pushRoute(name: string) {
        const route = this.routes[name];

        if (!route) {
            throw new Error(`Route not configured for ${name}`);
        }

        const pushURL = route.pushURL;

        if (!pushURL) {
            throw new Error(`pushURL not configured for route ${name}`);
        }

        this.redirectFn?.(pushURL);
    }

    /**
     * Get the RouteConfig by its name.
     */
    public getRoute(name: string): RouteConfig | undefined {
        const route = this.routes[name];
        return route;
    }

    /**
     * Redirect to any URL, relative or absolute, can be different domain.
     */
    public pushURL(url: string) {
        this.redirectFn?.(url);
    }

    /**
     * Replace URL with given URL by route name.
     *
     * @throws if route does not exist or pushURL not set.
     */
    public replaceRoute(name: string) {
        const route = this.routes[name];

        if (!route) {
            throw new Error(`Route not configured for ${name}`);
        }

        const pushURL = route.pushURL;

        if (!pushURL) {
            throw new Error(`pushURL not configured for route ${name}`);
        }

        this.redirectFn?.(pushURL);
    }

    /**
     * Replace current URL with given one without reloading the page.
     */
    public replaceURL(url: string) {
        this.replaceFn?.(url);
    }

    public onRedirect(redirectFn: (url: string) => void ) {
        this.redirectFn = redirectFn;
    }

    public onReplace(replaceFn: (url: string) => void ) {
        this.replaceFn = replaceFn;
    }

    /**
     * Register callback for checking route prior to navigating to it.
     * The callback function is expected to return true if all is OK
     * and no changes to the routing have been made.
     *
     * The callback function can call router.replaceRoute() as needed,
     * in such case the function must return false to avoid un unnecessary UI update.
     *
     * Be careful to not introduce infinite redirects.
     *
     * @param preRouteFn callback to call prior to updating the UI after matching
     * has been processed. If it returns true then update() is not called.
     */
    public onPreRoute(preRouteFn: (active: ActiveRoutes) => boolean | undefined ) {
        this.preRouteFn = preRouteFn;
    }

    /**
     * If not route was matched the fallback callback is called.
     * @param fallbackFn function to call when no route was matched.
     * If it returns true then update() is not called.
     */
    public onFallback(fallbackFn: (url: string) => boolean | undefined) {
        this.fallbackFn = fallbackFn;
    }

    protected match() {
        // Clear out object but keep its reference
        for (const key in this.active) {
            delete this.active[key];
        }

        const subGroupsRequired: {[name: string]: boolean} = {};
        const subGroupsSatisfied: {[name: string]: boolean} = {};

        const hashURL = this.parseHash(this.location);

        const routes = Object.keys(this.routes);
        const routesLength = routes.length;
        for (let i=0; i<routesLength; i++) {
            const name = routes[i];

            if (name === "404") {
                continue;
            }

            const {match, nomatch, group, base, subGroup, reroute} = this.routes[name];

            if (!hashURL.startsWith(base ?? "")) {
                continue;
            }

            if (nomatch) {
                if (hashURL.slice(base?.length ?? 0).match(nomatch)?.length) {
                    continue;
                }
            }

            if (subGroup) {
                subGroupsRequired[subGroup] = true;
            }

            const args = hashURL.slice(base?.length ?? 0).match(match);

            if (args && args.length > 0) {
                if (reroute) {
                    this.replaceRoute(reroute);
                    return;
                }

                const search = this.getHashQueryData(this.location, name);

                if (group?.length) {
                    if (!this.active[group]) {
                        this.active[group] = {
                            name: group,
                            location: this.location,
                            args: args.slice(1),
                            search,
                        };
                    }
                }

                this.active[name] = {
                    name,
                    location: this.location,
                    args: args.slice(1),
                    search,
                };

                if (subGroup) {
                    subGroupsSatisfied[subGroup] = true;
                }
            }
        }

        const keys = Object.keys(subGroupsRequired);

        let notFound = false;
        for (let keysIndex = 0; keysIndex < keys.length; keysIndex++) {
            const key = keys[keysIndex];
            if (!subGroupsSatisfied[key]) {
                notFound = true;
                break;
            }
        }

        if (notFound || Object.keys(this.active).length === 0) {
            // Clear out any possible matches so that 404 stands alone.
            //
            Object.keys(this.active).forEach( key => {
                delete this.active[key];
            });

            this.active["404"] = {
                name: "404",
                location: this.location,
                args: [],
                search: {},
            };

            if (this.fallbackFn) {
                if (this.fallbackFn(this.location)) {
                    this.updateFn?.();
                    return;
                }
            }
        }

        if (this.preRouteFn && this.preRouteFn(this.active) === true) {
            return;
        }

        this.updateFn?.();
    }

    /**
     * @returns what is after the hash, not including the hash. "/" as minimal, never empty.
     */
    protected parseHash(url: string) {
        const urlObject = new URL(url, "https://example.org");

        const hash = urlObject.hash;

        if (hash.length <= 1) {
            return "/";
        }

        return hash.slice(1);
    }

    /**
     * Get the JSON parsed value of the search param given by queryName found *after* the hash.
     * This is NOT the traditional query which comes after the path but instead after the hash.
     * @param url the full url
     * @param queryName key for the value of the "#...?key=value" part in the url.
     * @returns JSON parsed object.
     */
    protected getHashQueryData(url: string, queryName: string): JSONType {
        const url2 = new URL(url);

        const index = url2.hash.indexOf("?");

        if (index < 0) {
            return {};
        }

        const searchParams = new URLSearchParams(url2.hash.slice(index));

        const data = searchParams.get(queryName);

        if (!data) {
            return {};
        }

        try {
            return JSON.parse(data);
        }
        catch(e) {  //eslint-disable-line @typescript-eslint/no-unused-vars
            return {};
        }
    }

    /**
     * In given URL replace the hash search param given by queryName.
     *
     * Note that this is not the traditional search params which come after the path in the
     * url but this is after the hash in the url.
     *
     * @param url the full url in which to replace
     * @param queryName key for the value of the "#...?key=value" part in the url.
     * @param data will be JSON encoded and set as value to the search param.
     * @returns updated url
     */
    public replaceHashQueryData(url: string, queryName: string, data: JSONType): string {
        const url2 = new URL(url);

        const index = url2.hash.indexOf("?");

        const searchParams = new URLSearchParams(index >= 0 ? url2.hash.slice(index + 1) : "");

        searchParams.set(queryName, JSON.stringify(data));

        if (index >= 0) {
            url2.hash = url2.hash.slice(0, index) + "?" + searchParams.toString();
        }
        else {
            url2.hash = url2.hash = url2.hash + "?" + searchParams.toString();
        }

        return url2.toString();
    }

    /**
     * Compare two RouteParams objects to see if
     * there has been any change in parsed arguments or hash query data
     * @param oldRoute
     * @param newRoute
     */
    public hasChanged(oldRoute: RouteParams | undefined, newRoute: RouteParams): boolean {
        if (!oldRoute) {
            return true;
        }

        if (JSON.stringify(oldRoute.args) !== JSON.stringify(newRoute.args)) {
            return true;
        }

        if (JSON.stringify(oldRoute.search) !== JSON.stringify(newRoute.search)) {
            return true;
        }

        return false;
    }
}
