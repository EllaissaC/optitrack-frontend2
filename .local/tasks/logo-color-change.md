# Change Sidebar Logo Color

## What & Why
Change the background color of the logo icon box above "OptiTrack" in the sidebar from the current primary color to #FFEF8A.

## Done looks like
- The small rounded square icon above "OptiTrack" in the sidebar displays with a #FFEF8A background color.
- The Package icon inside remains visible and readable against the new background.

## Out of scope
- Any other color or style changes

## Tasks
1. Update the logo container div in the sidebar header to use `#FFEF8A` as its background color instead of `bg-primary`. Also adjust the icon color inside if needed for contrast against the light yellow background.

## Relevant files
- `client/src/components/app-sidebar.tsx:55-65`
