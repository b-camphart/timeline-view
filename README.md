# Timeline View

Display your obsidian notes in a timeline, based on a given property.

## Features

### Property
Select whichever property you'd like to use to order the notes.  "created" will order the notes based on the time they were created, "modified" will order them based on the time they were modified.

![Align notes based on created date](docs/resources/created-date-example.PNG)

Any other property name can be used.  If a given note does not have the property, it will default to `0`.

![Align notes based on arbitrary property](docs/resources/arbitrary-property.PNG)

Timeline view will automatically detect all the properties you have defined in your vault, and their types.

![Available properties](docs/resources/available-properties.PNG)

When a property is selected, the notes will automatically be re-arranged, and the appropriate type of measurement will appear at the top of the timeline.

### Names below points
Toggle if you'd like to see the names of notes below their point on the timeline.  

![Display notes below points](docs/resources/display-notes-below-points.PNG)

This is off by default, as any notes that are close together may overlap.  However, you can place your mouse over a note to display both its name, and the value it has for the selected property.

# Roadmap

- [ ] Filter based on obsidian query
- [ ] Color groups based on obsidian query
- [ ] [Manual Vertical Positioning of Notes](https://github.com/b-camphart/plot-point-timeline/issues/1)
- [ ] [Vertical Layout](https://github.com/b-camphart/plot-point-timeline/issues/2)
- [ ] [Create new note with property based on filter and position in timeline](https://github.com/b-camphart/plot-point-timeline/issues/4)
- [ ] [Embeds?](https://github.com/b-camphart/plot-point-timeline/issues/6)
- [ ] [Mobile support](https://github.com/b-camphart/plot-point-timeline/issues/7)
- [ ] Duration/length and/or end property