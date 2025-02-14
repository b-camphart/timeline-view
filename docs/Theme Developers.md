# For Theme Developers

## Css Variables

The easiest way to customize the appearance of the Timeline View plugin is to modify the css variables. A few of them are configurable by the user via the [Style Settings](https://github.com/mgmeyers/obsidian-style-settingsgithub.com/) plugin. If you're planning to supply new, default values for these variables, please also maintain the ability for users to override them. When a variable is configurable, it will be marked accordingly.

The css variables can be found in [src/obsidian/timeline/variables.css](/src/obsidian/timeline/variables.css).

## Classes

To prevent conflicts with other plugins, most classes in this plugin are prefixed with timeline-view--. While Svelte is used to encapsulate styles within this plugin, other plugins might use similar class names, leading to unintended overrides.

Since Svelte assigns unique svelte-_ classes to elements, most styles target both the timeline-view--_ and svelte-_ classes. This makes them *more specific* than standalone timeline-view--_ selectors, meaning these styles may require `!important` to be overridden.

### DOM Structure and Class List

Here is a list of the currently defined classes, in the (general) structure they appear within the DOM:

- `.timeline-view--timeline`
    - `.timeline-view--ruler`
        - `.timeline-view--ruler-label`
    - `.timeline-view--plotarea`
        - `.timeline-view--plotarea-background`
    - `.timeline-view--controls`
        - `.timeline-view--controls-group`
            - `.timeline-view--nav-controls`
                - `.timeline-view--control-item`
            - `.timeline-view--timeline-settings`
            - `.timeline-view--control-item`

This structure may evolve with future updates, so consider using flexible selectors when applying custom styles.
