<h1 align="center">Obsidian Timeline View</h1>

<p align="center">Display your obsidian notes in a timeline, based on a given property.</p>

Transform the way you explore your notes with the Obsidian Timeline View Plugin! This powerful plugin introduces a dynamic new view in Obsidian, allowing you to visually order your notes based on custom properties. Whether you're tracking dates, progress, or any numerical data, you can bring clarity to your vault with an interactive graphical "timeline" or "number line."

## 🌟 Key Features

-   [**Custom Ordering:**](#ordering-by-any-numeric-property) Choose a property in your notes and instantly see them ordered in a visual timeline or number line.
-   [**Item Lengths & Resizing:**](#item-lengths) Assign a secondary property and choose whether it represents **a length or an end value**. Resize items directly in the timeline.
-   [**Quick Note Creation:**](#-quick-note-creation) Double-click anywhere on the timeline or number line to create a new note with the property value set based on where you clicked.
-   [**Drag & Drop Reordering:**](#-drag--drop-reordering) Easily move notes around, with multi-select support, to update their property values on the fly.
-   [**Filtering:**](#-filter) Refine your view with filters using Obsidian’s search syntax.
-   [**Grouping with Color:**](#-group-notes-with-colors) Group notes by Obsidian search query, similar to Obsidian's graph view, for a more colorful visualization.

# Screenshots

#### Dark Theme

![Dark Theme Overview](docs/resources/Dark-Theme%20Overview.PNG)

#### Light Theme

![Light Theme Overview](docs/resources/Light-Theme%20Overview.PNG)

The view should work with any theme you apply.

## Features

### Ordering by _Any_ (numeric) Property

Each Timeline View orders your notes based on a property of your choice, which defaults to the creation time. You can open multiple views, each with its own selected property.

The plugin detects all properties within your vault and lists any numeric (date, datetime, or number) properties as available options. Once a property is selected, the notes automatically rearrange, and the timeline adapts to the appropriate measurement.

![Available properties](docs/resources/available-properties.PNG)

When a property is selected, the notes will automatically be re-arranged, and the appropriate type of measurement will appear at the top of the timeline.

### ✨ Quick Note Creation

Double-click anywhere on the timeline to instantly create a new note. The property value for this note will be automatically set based on where you clicked on the timeline.

![create note and open](docs/resources/create-note-example.gif)

### 📌 Drag & Drop Reordering

Easily update the property value of a note by dragging and dropping it on the timeline.

-   Move a single note:

    ![drag and drop single note](docs/resources/move-single-note-example.gif)

-   Or move a selection of notes to change their values together.

    ![drag and drop multiple notes](docs/resources/move-multiple-notes-example.gif)

### Item Lengths

You can assign a secondary property to represent the length or end value of each note. By default, the plugin uses the note's modification time as the "end" value, but this can be customized.

It will flawlessly handle negative lengths and end values that are less than the primary value.

![Secondary property](docs/resources/secondary%20property.PNG)

### Resizing

With a secondary property selected, you can change the length or end value of a note by dragging the edge of it.

-   Resizing a single note:

    ![resize single note](docs/resources/resize%20single%20note.gif)

-   Resizing multiple notes together:

    ![resize multiple notes](docs/resources/resize%20multiple%20notes.gif)
    (if you have groups dependent on the value of one of the properties, modifying a note can easily change the group it belongs to)

### 🔍 Filter

Want to focus only on relevant notes? Apply a filter to your timeline using a query that (mostly) follows Obsidian's search syntax. For details on syntax limitations, see [Obsidian Search](https://github.com/b-camphart/obsidian-search).

![Filter Property](docs/resources/filter-property.PNG)

The filtered view renames the tab to match the provided filter, making it easy to differentiate between multiple open timeline tabs.

![Filtered tab names](docs/resources/filtered-tab-name.PNG)

You can also set a default filter in the plugin settings to apply to every new timeline you open.

### 🎨 Group Notes with Colors

Use the same query syntax as filtering to group notes by color, similar to Obsidian's graph view. This makes it easy to visually distinguish different groups of notes on your timeline.

### 🔗 Focus on Notes from Other Tabs

The timeline view will now **automatically focus on notes** when they are selected in another tab.

-   If a note that exists in the timeline is focused in another Obsidian tab, the timeline will **scroll to and highlight** that note.
-   This makes it easier to keep track of where a note appears in your timeline while working in other views.

![Focused note](docs/resources/focused%20note%20from%20other%20tab.PNG)

# For Theme Developers

You can find details about the css variables and classes [here](/docs/Theme%20Developers.md).

# Roadmap

-   [x] Filter based on obsidian query
-   [x] Color groups based on obsidian query
-   [x] [Create new note with property based on filter and position in timeline](https://github.com/b-camphart/plot-point-timeline/issues/4)
-   [ ] [Manual Vertical Positioning of Notes](https://github.com/b-camphart/plot-point-timeline/issues/1)
-   [ ] [Vertical Layout](https://github.com/b-camphart/plot-point-timeline/issues/2)
-   [ ] [Embeds?](https://github.com/b-camphart/plot-point-timeline/issues/6)
-   [ ] [Mobile support](https://github.com/b-camphart/plot-point-timeline/issues/7)
-   [ ] Duration/length and/or end property
