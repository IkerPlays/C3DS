# Your first game in 10 minutes

This guide takes you from zero to a game you can play in the browser and build for your 3DS. No programming needed.

## 1. Start with a template
Open the **Editor** and press **Projects** → pick a template. For this guide use **Coin Collector**: it already has a player, a spinning coin, a scoreboard and a rule that adds points.

Press **▶ Test**. Move with the arrow keys. **⏸ Pause**, **⏭ Frame** and **Collision boxes** let you see what happens at every moment.

## 2. Change things
- Click an object on the stage or in the list. Its properties appear on the right: position, size, color, speed, gravity…
- Drag it to move it, or use the arrow keys (**Shift** moves 10 px). **Shift + click** selects several.
- **Ctrl+Z / Ctrl+Y** undo and redo. Everything is saved automatically in your browser.

## 3. Make things happen (Logic tab)
A rule says *“when this happens → do that”*. For example:
- **When** the player hits the coin → **add 1** to `score` and **place the coin at random**.
- **When** **A** is pressed *and also* the player is on the ground → **change its vertical speed** (a jump).

Add a rule with **+ New rule**, pick the event and the actions. A plain-language summary appears above each rule. The full reference is in **? → See all events and actions**.

## 4. Physics
- **Gravity** makes an object fall; **Solid** stops other objects from passing through it (floors, walls, platforms).
- **Follows** makes an object chase another (enemies). **Opacity** and **Mirror** change how it looks.
- For floors and walls use a **sprite with tiles** (columns × rows).

## 5. Images, sound and scenes
- **Images**: upload PNG/JPG/WebP. The scissors icon slices a sprite sheet into frames and creates an animation.
- **Sounds**: WAV/OGG/MP3, converted automatically. Tick the loop icon for music.
- **Scenes**: menu, levels, game-over screen. Switch with the **Go to scene** action. In the **Scene** tab you pick the background, the transition, and the **author, description and icon** shown on the 3DS HOME menu.

## 6. High scores and variables
Create variables (`score`, `lives`…) and show them in a text with `{score}`. Tick the floppy icon to **save them on the SD card** and use **Keep the maximum in a variable** for a high score.

## 7. Take it to your 3DS
**Export** → *3DS project (.zip)* or *Build in the cloud (.3dsx + .cia)*. Copy the `.3dsx` to `/3ds/` on the SD card (Homebrew Launcher) or install the `.cia` with FBI. You can also try it in the [Azahar](https://azahar-emu.org/) emulator.

Other outputs: **HTML5** (for itch.io) and games for **Windows, macOS and Linux**.

> Honest note: the `.cia` builds in CI but has not been tested on a real console yet.
