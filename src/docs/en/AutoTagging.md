# Auto Tagging

This task iterates through your created Performers, Studios and Tags - based on what options you ticked. For each, it finds scenes where the filename contains the Performer/Studio/Tag name. For each scene it finds that matches, it sets the applicable field. Please note that this feature **does not do any kind of intelligent scene identification**.  It will **only** tag based on information that already exists in your database.  In order to identify and gather information about the scenes in your collection, you will need to use the Tagger view and/or Scraping tools.

Where the Performer/Studio/Tag name has multiple words, the search will include filenames where the Performer/Studio/Tag name is separated with `.`, `-` or `_` characters, as well as whitespace.

For example, auto tagging for performer `Jane Doe` will match the following filenames:
* `Jane.Doe.1.mp4`
* `Jane_Doe.2.mp4`
* `Jane-Doe.3.mp4`
* `Jane Doe.4.mp4`

Matching is case insensitive, and should only match exact wording within word boundaries. For example, `Jane Doe` will not match `Maryjane-Doe`, but may match `Mary-Jane-Doe`.

Auto tagging for specific Performers, Studios and Tags can be performed from the individual Performer/Studio/Tag page.
