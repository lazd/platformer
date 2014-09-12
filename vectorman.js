var game = new Phaser.Game(1024, 768, Phaser.AUTO, 'vectorman', {
  preload: preload,
  create: create,
  update: update,
  render: render
});

var ANIMATIONSPEED = 60; // fps

// The number of frames in the landing animation
var TIMETOLAND = 16/60 * 1000;

// The number of frames in the getting up animation
var TIMETOGETUP = 6/60 * 1000;

// The number of frames in the start running animation
var TIMETORUN = 26/60 * 1000;

// World gravity
var GRAVITY = 1500;

// The time between jumps
var JUMPVELOCITY = 570;
var BOOSTVELOCITY = 670;
var MAXBOOSTS = 1;

// The speed of running
var RUNSTARTSPEED = 200;
var RUNFULLSPEED = 400;

var VELOCITYDAMPING = 0.85;

var map;
var tileset;
var foreground;
var background;
var player;
var isRunning = false;
var mode = null;
var facing = 'right';
var runTimer = 0;
var cursors;
var jumpButton;
var bg;
var music;
var audio;
var flag;

// Start of level
var levelStartTime;

// Whether the player is currently running at full speed
var fullSpeed = false;

// The time when we can next boost
var jumpReleased = true;

// The number of boosts the player has used in flight
var boostCount = 0;

// When the player started landing
var landStart = 0;

// When the player started getting up
var getUpStart = 0;

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

WebFontConfig = {
    active: function() {},

    google: {
      // List of fonts to load
      families: ['Revalia']
    }
};

var sounds = [
  'head bump',
  'land',
  'boost',
  'yea'
];

function preload() {
  game.load.tilemap('level1', 'assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
  game.load.image('tiles', 'assets/tiles.png');
  game.load.spritesheet('vectorman', 'assets/vectorman.png', 100, 100);
  game.load.spritesheet('flag', 'assets/flag.png', 128, 64);
  game.load.image('background', 'assets/background.png');
  game.load.audio('bamboo-mill', ['assets/music/Bamboo Mill.ogg']);

  sounds.forEach(function(sound) {
    game.load.audio(sound, 'assets/audio/'+sound+'.wav');
  });

  game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');
}

/**
  Create an array with numbers from start to end inclusive
*/
function spriteMap(start, end) {
  var map = [];
  for (var i = start; i <= end; i++) {
    map.push(i);
  }
  return map;
}

function playSound(sound) {
  audio[sound].play();
}

function create() {
  // Play music
  music = game.add.audio('bamboo-mill');
  music.play();

  // Setup audio
  audio = {};
  sounds.forEach(function(sound) {
    audio[sound] = game.add.audio(sound);
  });

  // Start physics simulation
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // Same as bottom of background
  game.stage.backgroundColor = '#261e11';
  bg = game.add.tileSprite(0, 0, 3188, 900, 'background');
  bg.fixedToCamera = true;

  map = game.add.tilemap('level1');

  map.addTilesetImage('tiles');

  background = map.createLayer('Background');
  background.resizeWorld();

  foreground = map.createLayer('Foreground');
  foreground.resizeWorld();

  // Collide on everything in the foreground
  map.setCollisionBetween(0, 1000, true, foreground);
  game.physics.arcade.TILE_BIAS = 40;
  // game.physics.arcade.gravity.y = GRAVITY; // Global gravity

  // Game sprites
  flag = game.add.sprite(3840, 224, 'flag');
  flag.animations.add('wave', spriteMap(0, 29), ANIMATIONSPEED, true);
  flag.animations.play('wave');
  game.physics.enable(flag, Phaser.Physics.ARCADE);

  // Setup player
  player = game.add.sprite(128, 768, 'vectorman');
  player.anchor.setTo(0.5, 0); // So it flips around its middle
  game.physics.enable(player, Phaser.Physics.ARCADE);

  player.body.bounce.y = 0; // Don't bounce
  player.body.gravity.y = GRAVITY; // Be affected by gravity
  player.body.collideWorldBounds = true;
  player.body.setSize(38, 50, 0, 39);

  setSpriteDirection(player, facing);

  // Setup animations
  for (var animationName in animations) {
    var animationFrames = animations[animationName];
    // console.log('Animation %s runs from %d to %d', animationName, animationFrames[0]-1, animationFrames[1]-1);
    player.animations.add(animationName, spriteMap(animationFrames[0]-1, animationFrames[1]-1), ANIMATIONSPEED, animationFrames[2]);
  }

  game.camera.follow(player);

  // Controls
  cursors = game.input.keyboard.createCursorKeys();
  jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

  if (window.location.hash.match('tweak')) {
    tweak();
  }

  if (window.location.hash.match('debug')) {
    debug();
  }

  if (window.location.hash.match('nomusic')) {
    stopMusic();
  }

  // Store level start time
  levelStartTime = Date.now();
}

function stopMusic() {
  // Stop if it is already playing
  music.stop();

  // Stop if it hasn't played yet
  music.onPlay.add(function() {
    music.stop();
  });
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

function run(direction) {
  var additionalRunVelocity = 0;

  // Set sprite direction
  setSpriteDirection(player, direction);

  if (facing !== direction) {
    // If they switch direction, make it so they just started running
    isRunning = false;
  }

  if (!isRunning) {
    // Start a timer where we'll run at full speed
    runTimer = game.time.now + TIMETORUN;

    fullSpeed = false;
    isRunning = true;
    facing = direction;
  }
  else {
    if (!fullSpeed && game.time.now > runTimer) {
      // We're now running at full speed
      fullSpeed = true;
    }
  }

  if (!fullSpeed) {
    // Accerate to full speed
    additionalRunVelocity = (1 - (runTimer - game.time.now) / TIMETORUN) * (RUNFULLSPEED - RUNSTARTSPEED);
  }

  var onFloor = player.body.onFloor();

  if (onFloor) {
    // Switch the animation
    var animation = 'run' + (fullSpeed ? '' : '-start');

    player.animations.play(animation);
  }
  else if (mode != 'jump') {
    // It should look like we're jumping if we're running, but we're not touching the ground
    mode = 'jump';
    player.animations.play('jump');
  }

  if (mode === 'crouch') {
    // Reset mode if in crouch to avoid getting stuck on the running animation
    mode = null;
  }

  if (onFloor && mode === 'jump') {
    // Reset mode if in jump to avoid getting stuck on the running animation instead of falling 
    mode = null;
  }

  // Set speed
  player.body.velocity.x = (direction === 'left' ? -1 : 1) * ((fullSpeed ? RUNFULLSPEED : RUNSTARTSPEED) + additionalRunVelocity);
}

function update() {
  // Only apply physics to the foreground
  game.physics.arcade.collide(player, foreground, collisionHandler);

  // Reset velocity
  var headHit = player.body.blocked.up;
  var onFloor = player.body.blocked.down;

  if (Math.abs(player.body.velocity.x)) {
    player.body.velocity.x *= VELOCITYDAMPING;
  }

  if (headHit) {
    playSound('head bump');
  }

  if (mode === 'jump' && onFloor) {
    playSound('land');
  }

  if (cursors.left.isDown) {
    run('left');
  }
  else if (cursors.right.isDown) {
    run('right');
  }
  else {
    isRunning = false;

    if (onFloor) {
      // If we were jumping, but we landed on the floor, show the landing animation
      if (mode === 'jump') {
        mode = 'land';
        player.animations.play('land');
        landStart = game.time.now;
      }

      if (cursors.down.isDown) {
        if (mode != 'crouch') {
          player.animations.play('crouch');
        }
        mode = 'crouch';

        // When crouched, we stick immediately instead of sliding
        player.body.velocity.x = 0;
      }
      else if (mode === 'crouch') {
        player.animations.play('getup');
        mode = 'getup';
        getUpStart = game.time.now;
      }
    }
  }

  // If we're:
    // not on the floor
    // not pressing jump
    // not over boost count
  var canBoost = false;
  if (jumpReleased && !onFloor && boostCount < MAXBOOSTS) {
    canBoost = true;
  }

  if (jumpButton.isDown) {
    if (jumpReleased) {
      if (onFloor) {
        player.body.velocity.y = -1 * JUMPVELOCITY;
        mode = 'jump';
        player.animations.play('jump');
      }
      else if (jumpButton.isDown && canBoost) {
        player.body.velocity.y = -1 * BOOSTVELOCITY;
        boostCount++;
        player.animations.stop();
        player.animations.play('boost');
        playSound('boost');
      }
    }

    jumpReleased = false;
  }
  else {
    jumpReleased = true;
  }

  var isJumping = mode === 'jump';
  var isLanding = mode === 'land' && game.time.now < landStart + TIMETOLAND;
  var isCrouching = mode === 'crouch';
  var isGettingUp = mode === 'getup' && game.time.now < getUpStart + TIMETOGETUP;

  if (!isJumping && !isCrouching && !isLanding && !isGettingUp) {
    // Idle modes
    if (onFloor) {
      if (!isRunning) {
        player.animations.play('idle');
        mode = 'idle';
      }
      else {
        // Reset mode after landing
        mode = null;
      }
    }
    else {
      mode = 'jump';
      player.animations.play('fall');
    }
  }

  // When we touch the ground, reset boost count
  if (onFloor) {
    boostCount = 0;
  }

  // Test if the player touches the flag
  if (levelComplete) {
    // Flag follows player
    // var dirFactor = facing === 'left' ? 1 : -1;
    // flag.x = player.x - flag.width + 32*dirFactor;
    // flag.y = player.y + 32;
    // setSpriteDirection(flag, facing === 'left' ? 'right' : 'left');
  }
  else {
    game.physics.arcade.collide(player, flag, flagCollisionHandler);
  }
}

var levelComplete = false;
function flagCollisionHandler(ob1, obj2) {
  if (levelComplete) {
    return;
  }
  levelComplete = true;

  var levelTime = (Date.now() - levelStartTime) / 1000;

  playSound('yea');

  // Give the flag gravity so it falls
  flag.body.gravity.y = GRAVITY;
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;

  console.log('Level complete!');

  text = game.add.text(flag.x, flag.y, 'level complete\n'+levelTime.toFixed(2)+'s');
  text.anchor.setTo(1);

  text.font = 'Revalia';
  text.fontSize = 60;

  text.fill = 'white';

  text.align = 'center';
  text.stroke = '#000000';
  text.strokeThickness = 2;
  text.setShadow(5, 5, 'rgba(0,0,0,0.5)', 5);
}

function collisionHandler(obj1, obj2) {
}

function render() {
  if (game.debugMode) {
    // game.debug.text(game.time.physicsElapsed, 32, 32);
    game.debug.body(player);
    game.debug.bodyInfo(player, 16, 24);
  }
}
