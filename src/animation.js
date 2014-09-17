// Disable smoothing
PIXI.scaleModes.DEFAULT = PIXI.scaleModes.NEAREST;

var SCALE = 3;
var ANIMATIONSPEED = 60;

var player;
var grid;
var pixel;

// DOM methods
var $ = document.querySelector.bind(document);
var createEl = document.createElement.bind(document);

// 1 based frame numbers of animations
var animations = {
  'idle': [1, 31, false],
  'run-start': [32, 57, false],
  'run': [58, 91, true],
  'jump': [92, 120, false],
  'boost': [121, 156, false],
  'fall': [120, 120, false],
  'land': [157, 173, false],
  'crouch': [174, 177, false],
  'getup': [178, 184, false]
};

var parts = {
  'ball-large': [16, 16],
  'ball-medium-dark': [7, 7],
  'ball-medium-light': [7, 7],
  'ball-oblong-dark': [13, 12],
  'ball-oblong-light': [13, 12],
  'ball-oblong': [13, 11],
  'ball-small-dark': [5, 5],
  'ball-small-light': [5, 5],
  'connector': [3, 3],
  'foot': [16, 9],
  'hand': [9, 8],
  'head': [9, 8]
};

var game = new Phaser.Game(256, 256, Phaser.CANVAS, '', {
  preload: preload,
  create: create,
  update: update,
  render: render
});

function newGame() {
  levelTimes.length = 0;
  game.state.start('run');
}

function preload() {
  game.load.spritesheet('vectorman', 'assets/sprites/vectorman.png', 100, 100);
  game.load.image('grid', 'assets/sprites/grid.png', 256, 256);

  for (var part in parts) {
    game.load.image(part, 'assets/sprites/parts/'+part+'.png', parts[part][0], parts[part][1]);
  }
}

/**
  Create an array with numbers from start to end inclusive
*/
function spriteRange(start, end) {
  var array = [];
  for (var i = start; i <= end; i++) {
    array.push(i);
  }
  return array;
}

function create() {
  // Same as bottom of background
  game.stage.backgroundColor = '#CCCCCC';

  // Setup grid
  grid = game.add.image(0, 0, 'grid');

  // Setup player sprite
  player = game.add.sprite(128, 128, 'vectorman');
  player.anchor.setTo(0, 0);
  player.x = game.width / 2 - player.width / 2;
  player.y = game.height / 2 - player.height / 2;

  // Setup animations
  for (var animationName in animations) {
    var animationFrames = animations[animationName];
    player.animations.add(animationName, spriteRange(animationFrames[0]-1, animationFrames[1]-1), ANIMATIONSPEED, animationFrames[2]);
  }

  // Setup player parts

  // Double size
  game.scale.minWidth = game.width*2;
  game.scale.minHeight = game.height*2;
  game.scale.setSize();

  pixel = { scale: SCALE, canvas: null, context: null, width: 0, height: 0 };

  // Hide the un-scaled game canvas
  game.canvas.style.display = 'none';

  // Create our scaled canvas. It will be the size of the game * whatever scale value you've set
  pixel.canvas = Phaser.Canvas.create(game.width * pixel.scale, game.height * pixel.scale);

  // Store a reference to the Canvas Context
  pixel.context = pixel.canvas.getContext('2d');

  // Add the scaled canvas to the DOM
  Phaser.Canvas.addToDOM(pixel.canvas);

  // Disable smoothing on the scaled canvas
  Phaser.Canvas.setSmoothingEnabled(pixel.context, false);

  // Cache the width/height to avoid looking it up every render
  pixel.width = pixel.canvas.width;
  pixel.height = pixel.canvas.height;

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeyDown);

  var $parts = $('#parts');
  for (var part in parts) {
    var partLi = createEl('li');
    var partImg = createEl('img');
    var width = parts[part][0] * SCALE;
    partImg.style.width = width + 'px';
    partImg.src = 'assets/sprites/parts/'+part+'.png'
    partImg.style.marginLeft = 32 - (width/2) + 'px';
    partImg.style.marginRight = 32 - (width/2) + 'px';
    partLi.appendChild(partImg);
    partLi.appendChild(document.createTextNode(part));
    $parts.appendChild(partLi);
  }
}

var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;
var LEFTBRACKET = 219;
var RIGHTBRACKET = 221;

function handleKeyDown(event) {
  var key = event.which;

  switch (key) {
    case LEFTBRACKET:
      if (player.frame > 0) {
        player.frame--;
      }
      else {
        player.frame = player.animations.frameTotal - 1;
      }
      break;
    case RIGHTBRACKET:
      if (player.frame < player.animations.frameTotal - 1) {
        player.frame++;
      }
      else {
        player.frame = 0;
      }
      break;
  }

  // event.preventDefault();
}

var mouseCoords = { x: 0, y: 0};
function handleMouseMove(event) {
  var x = mouseCoords.x = Math.ceil(event.x / SCALE);
  var y = mouseCoords.y = Math.ceil(event.y / SCALE);

  $('#mouseCoords').innerHTML = x+','+y;
}

function handleClick(event) {
  // Place selected item at mouse location
}

/**
  Flip the sprite to match the given direction
*/
function setSpriteDirection(sprite, direction) {
  if (direction === 'right') {
    sprite.scale.x = -1;
  }
  else {
    sprite.scale.x = 1;
  }
}

function update() {
}

function render() {
  // Every loop we need to render the un-scaled game canvas to the displayed scaled canvas:
  pixel.context.drawImage(game.canvas, 0, 0, game.width, game.height, 0, 0, pixel.width, pixel.height);
}
