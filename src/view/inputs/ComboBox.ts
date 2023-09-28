/**
 * Calls the provided `htmlCallback` function on an event, if the target is an
 * HTMLElement.
 * @param htmlCallback 
 * @returns 
 */
export function callOnHTMLEvent(htmlCallback: (element: HTMLElement) => void) {
    return (event: Event) => {
        const target = event.target;
        if (target != null && target instanceof HTMLElement) {
            htmlCallback(target)
        }
    }
}