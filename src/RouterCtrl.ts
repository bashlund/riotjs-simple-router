/**
 * RouterCtrl is a helper class to control the Router when not connecting it to the Window object.
 */
import {
    Router,
} from "./Router";

export class RouterCtrl {
    protected history: string[] = [];

    /**
     * @param href first push of href must be absolute url
     */
    constructor(protected router: Router, href?: string) {
        router.onRedirect( (url) => this.pushHref(url) );

        router.onReplace( (url) => this.replaceHref(url) );

        if (href) {
            this.pushHref(href);
        }
    }

    public pushHref(href: string) {
        this.history.push(this.parse(href));

        this.handleChange();
    }

    public replaceHref(href: string) {
        this.history[this.history.length - 1] = this.parse(href);

        this.handleChange();
    }

    public getHistory(): string[] {
        return this.history;
    }

    protected handleChange() {
        this.router.updateLocation(this.history[this.history.length - 1]);
    }

    protected parse(href: string): string {
        const absolute = new URL(href, this.history[this.history.length - 1]);

        return absolute.toString();
    }
}
