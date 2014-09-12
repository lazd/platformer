// Google WebFonts
WebFontConfig = {
    active: function() {},

    google: {
      // List of fonts to load
      families: ['Revalia']
    }
};

// Time to pause between levels
var LEVELPAUSETIME = 7000;

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
var currentLevel;

// Player score
var levelTimes = [];

// Level variables
var currentLevelIndex = 0; // The first level to load
var levelComplete = false; // Whether the level has been beaten

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

// All sounds to load
var sounds = [
  'head bump.wav',
  'land.wav',
  'boost.wav',
  'yea.wav',
  'level complete.mp3'
];

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

var levels = [];

levels[0] = {
  player: [128, 768],
  flag: [3840, 224],
  map: '1',
  tiles: 'scifi',
  music: 'Bamboo Mill',
  facing: 'right',
  background: {
    name: 'city',
    width: 3188,
    height: 900
  },
  setup: function() {}
};

var game = new Phaser.Game(1024, 768, Phaser.AUTO, 'vectorman');

game.state.add('run', {
  preload: preload,
  create: create,
  update: update,
  render: render,
  shutdown: function() {
    // Stop music
    game.sound.remove(music);
  }
});

newGame();

function newGame() {
  levelTimes.length = 0;
  game.state.start('run');
}

function preload() {
  game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');

  for (var name in levels) {
    var level = levels[name];
    game.load.tilemap(level.map, 'assets/levels/'+level.map+'.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tiles-'+level.tiles, 'assets/tiles/'+level.tiles+'.png');
    game.load.image('background-'+level.background.name, 'assets/backgrounds/'+level.background.name+'.png');

    game.load.audio(level.music, ['assets/music/'+level.music+'.ogg', 'assets/music/'+level.music+'.mp3']);
  }

  game.load.spritesheet('vectorman', 'assets/sprites/vectorman.png', 100, 100);
  game.load.spritesheet('flag', 'assets/sprites/flag.png', 128, 64);

  // Load each sound
  sounds.forEach(function(sound) {
    game.load.audio(sound, 'assets/sound/'+sound);
  });
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

function playSound(sound) {
  audio[sound].play();
}

function restart() {
  game.state.restart();
}

function nextLevel() {
  if (currentLevelIndex < levels.length-1) {
    currentLevelIndex++;
  }
  else {
    currentLevelIndex = 0;
  }
  loadLevel(currentLevelIndex);
}

function loadLevel(index) {
  if (!levels[currentLevelIndex]) {
    console.error('Cannot load level %d', index);
    return;
  }

  currentLevelIndex = index;

  restart();
}

function create() {
  currentLevel = levels[currentLevelIndex];

  console.log('Starting game');

  // Reset variables
  levelComplete = false;

  // Setup audio
  audio = {};
  sounds.forEach(function(sound) {
    audio[sound.split('.')[0]] = game.add.audio(sound);
  });

  // Play music
  music = game.add.audio(currentLevel.music);
  music.play();

  // Start physics simulation
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // Same as bottom of background
  game.stage.backgroundColor = '#261e11';
  bg = game.add.tileSprite(0, 0, currentLevel.background.width, currentLevel.background.height, 'background-'+currentLevel.background.name);
  bg.fixedToCamera = true;

  map = game.add.tilemap(currentLevel.map);
  map.addTilesetImage('tiles-'+currentLevel.tiles);

  background = map.createLayer('Background');
  background.resizeWorld();

  foreground = map.createLayer('Foreground');
  foreground.resizeWorld();

  // Collide on everything in the foreground
  map.setCollisionBetween(0, 1000, true, foreground);
  game.physics.arcade.TILE_BIAS = 40;
  // game.physics.arcade.gravity.y = GRAVITY; // Global gravity

  // Game sprites
  flag = game.add.sprite(0, 0, 'flag');
  flag.animations.add('wave', spriteRange(0, 29), ANIMATIONSPEED, true);
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

  setSpriteDirection(player, currentLevel.facing);

  // Setup animations
  for (var animationName in animations) {
    var animationFrames = animations[animationName];
    // console.log('Animation %s runs from %d to %d', animationName, animationFrames[0]-1, animationFrames[1]-1);
    player.animations.add(animationName, spriteRange(animationFrames[0]-1, animationFrames[1]-1), ANIMATIONSPEED, animationFrames[2]);
  }

  game.camera.follow(player);

  // Controls
  cursors = game.input.keyboard.createCursorKeys();
  jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

  // Store level start time
  levelStartTime = Date.now();

  // Set initial positions
  player.x = currentLevel.player[0];
  player.y = currentLevel.player[1];

  flag.x = currentLevel.flag[0];
  flag.y = currentLevel.flag[1];

  if (typeof currentLevel.setup === 'function') {
    currentLevel.setup();
  }

  if (window.location.hash.match('tweak')) {
    tweak();
  }

  if (window.location.hash.match('debug')) {
    debug();
  }

  if (window.location.hash.match('nomusic')) {
    stopMusic();
  }
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

function flagCollisionHandler(ob1, obj2) {
  if (levelComplete) {
    return;
  }
  levelComplete = true;

  var levelTime = (Date.now() - levelStartTime) / 1000;

  // Stop music
  stopMusic();
  // game.sound.remove(music);

  // Play win sound
  playSound('yea');
  playSound('level complete');

  // Give the flag gravity so it falls
  flag.body.gravity.y = GRAVITY;
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;

  text = game.add.text(flag.x, flag.y, 'level complete\n'+levelTime.toFixed(2)+'s');
  text.anchor.setTo(1);

  text.font = 'Revalia';
  text.fontSize = 60;

  text.fill = 'white';

  text.align = 'center';
  text.stroke = '#000000';
  text.strokeThickness = 2;
  text.setShadow(5, 5, 'rgba(0,0,0,0.5)', 5);

  console.log('Level completed in %f seconds', levelTime);

  // Store score
  levelTimes[currentLevelIndex] = levelTime;

  // Restart
  setTimeout(restart, LEVELPAUSETIME);
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
