// Google WebFonts
WebFontConfig = {
    active: function() {},

    google: {
      // List of fonts to load
      families: ['Revalia']
    }
};

// Time to pause between levels
var LEVELPAUSETIME = 6000;
var LEVELREADYTIME = 1500;

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
var JUMPVELOCITY = 600;
var BOOSTVELOCITY = 670;
var MAXBOOSTS = 1;

// The speed of running
var RUNSTARTSPEED = 200;
var RUNFULLSPEED = 400;

var VELOCITYDAMPING = 0.85;

var map;
var tileset;
var foreground;
var objects;
var background;
var player;
var isRunning = false;
var mode = null;
var facing = 'right';
var runTimer = 0;
var cursors;
var pauseKey;
var resetKey;
var jumpKey;
var bg;
var music;
var audio;
var flag;
var levelText;
var resetTimeout;
var unpauseTimeout;
var startText;
var countDown;
var countDownStart;

// Player score
var levelTimes = [];

// Level variables
var currentLevel;
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

// Whether we can run or not
var runDisabled = false;

// Stop faces from switching
var facingSwitchDisabled = false;

var lastWallJumpDirection;

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
  player: [130, 838],
  flag: [3984, 212],
  map: '1',
  tiles: 'vectorman',
  music: 'Bamboo Mill',
  facing: 'right',
  par: 16.00,
  background: {
    name: 'city',
    width: 3188,
    height: 900
  },
  setup: function() {}
};

var game = new Phaser.Game(1024, 768, Phaser.CANVAS, 'vectorman');

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

// Full restart of the game
function restart() {
  game.state.restart();
}

function pause() {
  game.paused = true;

  // Catch unpause
  document.addEventListener('keydown', unpause);
}

function unpause() {
  // Use a timeout so P can unpause the game
  clearTimeout(unpauseTimeout);

  unpauseTimeout = setTimeout(function() {
    game.paused = false;
  }, 100);

  document.removeEventListener('keydown', unpause);
}

// Reset the current level
function reset() {
  // Stop automatic resets
  clearTimeout(resetTimeout);

  // Reset complete status
  levelComplete = false;

  // Reset physics
  flag.body.velocity.x = 0;
  flag.body.velocity.y = 0;
  flag.body.gravity.y = 0;
  flag.x = currentLevel.flag[0];
  flag.y = currentLevel.flag[1];

  // Set initial positions
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;
  player.x = currentLevel.player[0];
  player.y = currentLevel.player[1];

  mode = null;

  if (music) {
    game.sound.remove(music);
  }

  // Remove text
  if (levelText) {
    levelText.destroy();
  }

  if (startText) {
    startText.destroy();
  }

  // Play music
  music = game.add.audio(currentLevel.music);
  music.play();

  setSpriteDirection(player, currentLevel.facing);

  // Text for starting the game
  startText = game.add.text(game.camera.x + game.width/2, game.camera.y + game.height/2);
  startText.anchor.setTo(0.5);

  startText.font = 'Revalia';
  startText.fontSize = 60;

  startText.fill = 'white';
  startText.align = 'center';
  startText.stroke = '#000000';
  startText.strokeThickness = 2;
  startText.setShadow(5, 5, 'rgba(0,0,0,0.5)', 5);

  // Disable input
  runDisabled = true;

  countDown = true;
}

function nextLevel() {
  var previousLevelIndex = currentLevelIndex;
  if (currentLevelIndex < levels.length-1) {
    currentLevelIndex++;
  }
  else {
    currentLevelIndex = 0;
  }

  if (previousLevelIndex === currentLevelIndex) {
    // Special case for when we have only one level
    // Just reset
    reset();
  }
  else {
    loadLevel(currentLevelIndex);
  }
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

  // Start physics simulation
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // Same as bottom of background
  game.stage.backgroundColor = '#261e11';
  bg = game.add.tileSprite(0, 0, currentLevel.background.width, currentLevel.background.height, 'background-'+currentLevel.background.name);
  bg.fixedToCamera = true;

  map = game.add.tilemap(currentLevel.map);
  map.addTilesetImage('tiles-'+currentLevel.tiles);

  // Background layer
  background = map.createLayer('Background');
  background.resizeWorld();

  // Collision layer
  objects = map.createLayer('Objects');
  objects.resizeWorld();

  // Setup player
  player = game.add.sprite(128, 768, 'vectorman');
  player.anchor.setTo(0.5, 0); // So it flips around its middle
  game.physics.enable(player, Phaser.Physics.ARCADE);

  player.body.bounce.y = 0; // Don't bounce
  player.body.gravity.y = GRAVITY; // Be affected by gravity
  player.body.collideWorldBounds = true;
  player.body.setSize(38, 50, 0, 40);

  // Foreground layer
  foreground = map.createLayer('Foreground');
  foreground.resizeWorld();

  // Collide on everything in the foreground
  map.setCollisionByExclusion([0], true, objects);
  game.physics.arcade.TILE_BIAS = 40;
  // game.physics.arcade.gravity.y = GRAVITY; // Global gravity

  // Game sprites
  flag = game.add.sprite(0, 0, 'flag');
  flag.animations.add('wave', spriteRange(0, 29), ANIMATIONSPEED, true);
  flag.animations.play('wave');
  game.physics.enable(flag, Phaser.Physics.ARCADE);

  // Setup animations
  for (var animationName in animations) {
    var animationFrames = animations[animationName];
    // console.log('Animation %s runs from %d to %d', animationName, animationFrames[0]-1, animationFrames[1]-1);
    player.animations.add(animationName, spriteRange(animationFrames[0]-1, animationFrames[1]-1), ANIMATIONSPEED, animationFrames[2]);
  }

  game.camera.follow(player);

  // Controls
  cursors = game.input.keyboard.createCursorKeys();
  jumpKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
  pauseKey = game.input.keyboard.addKey(Phaser.Keyboard.P);
  resetKey = game.input.keyboard.addKey(Phaser.Keyboard.R);

  // Start game
  reset();

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
    game.sound.remove(music);
  }
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
  if (!facingSwitchDisabled) {
    setSpriteDirection(player, direction);
  }

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
  if (countDown) {
    if (!countDownStart) {
      countDownStart = game.time.now;
    }

    var timeToStart = LEVELREADYTIME - (game.time.now - countDownStart);

    if (timeToStart < - LEVELREADYTIME / 2) {
      startText.destroy();
      startText = null;
      countDown = false;
      countDownStart = 0;
      runDisabled = false; // In case we pause during the countdown
    }
    else if (timeToStart < 0) {
      startText.text = 'Go!';
      runDisabled = false;

      // Store level start time
      levelStartTime = game.time.now;
    }
    else {
      startText.text = Math.ceil(timeToStart/1000 * 2);
    }
  }

  if (resetKey.isDown) {
    reset();
    return;
  }

  if (pauseKey.isDown) {
    pause();
    return;
  }

  if (startText) {
    startText.x = game.camera.x + game.width/2;
    startText.y = game.camera.y + game.height/2;
  }

  // Only apply physics to the objects layer
  game.physics.arcade.collide(player, objects, collisionHandler);

  // Reset velocity
  var headHit = player.body.blocked.up;
  var onFloor = player.body.blocked.down;
  var onWallLeft = player.body.blocked.left;
  var onWallRight = player.body.blocked.right;

  if (Math.abs(player.body.velocity.x)) {
    player.body.velocity.x *= VELOCITYDAMPING;
  }

  if (headHit) {
    playSound('head bump');
  }

  if (mode === 'jump' && onFloor) {
    playSound('land');
  }

  if (!runDisabled && cursors.left.isDown) {
    run('left');
  }
  else if (!runDisabled && cursors.right.isDown) {
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

  if (jumpKey.isDown) {
    if (jumpReleased) {
      if (onFloor) {
        player.body.velocity.y = -1 * JUMPVELOCITY;
        mode = 'jump';
        player.animations.play('jump');
      }
      else if (onWallLeft || onWallRight && player.body.velocity.y <= 0) {
        var jumpDirection = onWallLeft ? 'right' : 'left';
        if (lastWallJumpDirection === jumpDirection) {
          // jumpReleased = true; // ?
          return;
        }
        lastWallJumpDirection = jumpDirection;

        player.body.velocity.y = -1 * JUMPVELOCITY;
        var xVeloc = JUMPVELOCITY;

        if (onWallLeft) {
          facing = 'right';
        }
        else {
          facing = 'left';
          xVeloc *= -1;
        }

        mode = 'jump';
        player.animations.stop();
        player.animations.play('jump');

        facingSwitchDisabled = true;
        setSpriteDirection(player, facing);

        playSound('land');
      }
      else if (jumpKey.isDown && canBoost) {
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
    facingSwitchDisabled = false;
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

  if (onFloor) {
    // When we touch the ground, reset boost count
    boostCount = 0;

    // Reset wall jump direction
    lastWallJumpDirection = null;
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

  var levelTime = (game.time.now - levelStartTime) / 1000;

  var message = 'level '+(currentLevelIndex+1);
  var passed = levelTime < currentLevel.par;

  message += ' ' + (passed ? 'passed' : 'failed') + '\n\n';
  message += 'time: '+levelTime.toFixed(3)+'s\n\n'
  message += Math.abs(currentLevel.par - levelTime).toFixed(3) + 's '+(passed ? 'under' : 'over')+' par\n\n';

  var previousBestTime = levelTimes[currentLevelIndex];
  if (!previousBestTime || levelTime < previousBestTime) {
    message += 'new record!\n';

    if (previousBestTime) {
      message += (previousBestTime - levelTime).toFixed(3)+'s faster';
    }
  }
  else {
    message += 'best was '+(previousBestTime).toFixed(3)+'s';
  }

  console.log(message);

  // Store score
  levelTimes[currentLevelIndex] = Math.min(levelTimes[currentLevelIndex] || Infinity, levelTime);

  // Stop music
  game.sound.remove(music);

  // Play win sound
  playSound('yea');
  playSound('level complete');

  // Give the flag gravity so it falls
  flag.body.gravity.y = GRAVITY;

  // Stop the player
  player.body.velocity.x = 0;
  player.body.velocity.y = 0;

  levelText = game.add.text(game.camera.x + game.width/2, game.camera.y + game.height/2, message);
  levelText.anchor.setTo(0.5);

  levelText.font = 'Revalia';
  levelText.fontSize = 60;

  levelText.fill = 'white';

  levelText.align = 'center';
  levelText.stroke = '#000000';
  levelText.strokeThickness = 2;
  levelText.setShadow(5, 5, 'rgba(0,0,0,0.5)', 5);

  // Restart or go to next level
  resetTimeout = setTimeout(passed ? nextLevel : reset, LEVELPAUSETIME);
}

function collisionHandler(obj1, obj2) {
}

function render() {
  if (game.debugMode) {
    game.time.advancedTiming = true;
    game.debug.text(game.time.fps || '--', 2, 14, "#00ff00");
    // game.debug.text(game.time.physicsElapsed, 32, 32);
    game.debug.body(player);
    game.debug.bodyInfo(player, 16, 24);
  }
}
