# platformer
> A 2D platformer experiment

## Controls

**Arrow keys** for movement.

**Space** jumps. Pressing space again while in the air will "boost" jump you.

## Usage

Start a local server:

```
python -m SimpleHTTPServer
```

Open http://localhost:8000 in your browser.

## Building

To build the audio sprite:

```
npm run build
```

## Level editing

Use [Tiled](http://www.mapeditor.org) to edit levels.

Make sure your level has two layers, Background and Foreground. Only tiles in the Foreground layer will be subject to collision detection.

## Credits

Vectorman character &copy; 1995 SEGA 

Background based off of [Ephiarsis's Dystopian City](http://www.conceptart.org/forums/showthread.php/230307-Dystopian-City)

Music via [The Videogame Music Preservation Foundation](http://www.vgmpf.com/Wiki/index.php?title=Vectorman_(GEN))

Sounds via [The Sounds Resource](http://www.sounds-resource.com/genesis_32x_scd/vectorman/sound/114/)

Tiles by [Eris's Sci-fi platform tiles on OpenGameArt.org](http://opengameart.org/content/sci-fi-platform-tiles)
