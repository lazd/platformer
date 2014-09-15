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

var FONT = 'Gill Sans';

// The time between jumps
var JUMPVELOCITY = 600;
var BOOSTVELOCITY = 670;
var MAXBOOSTS = 1;

// The speed of running
var RUNSTARTSPEED = 200;
var RUNFULLSPEED = 400;

var VELOCITYDAMPING = 0.85;
var MAXWALLJUMPVELOCITY = 200;

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
var touches;

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
  'head bump',
  'land',
  'boost',
  'yea',
  'level complete'
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
  flag: [4048, 244],
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

var game = new Phaser.Game(Math.min(1024, window.innerWidth), Math.min(768, window.innerHeight), Phaser.CANVAS, 'vectorman');

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
  game.load.image('button-up', 'assets/sprites/button-up.png');
  game.load.image('button-down', 'assets/sprites/button-down.png');
  game.load.image('button-left', 'assets/sprites/button-left.png');
  game.load.image('button-right', 'assets/sprites/button-right.png');
  game.load.image('button-circle', 'assets/sprites/button-circle.png');
  game.load.image('button-square', 'assets/sprites/button-square.png');

  for (var name in levels) {
    var level = levels[name];
    game.load.tilemap(level.map, 'assets/levels/'+level.map+'.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tiles-'+level.tiles, 'assets/tiles/'+level.tiles+'.png');
    game.load.image('background-'+level.background.name, 'assets/backgrounds/'+level.background.name+'.png');

    game.load.audio(level.music, 'assets/music/'+level.music+'.mp3');
  }

  game.load.spritesheet('vectorman', 'assets/sprites/vectorman.png', 100, 100);
  game.load.spritesheet('flag', 'assets/sprites/flag.png', 128, 64);

  // Load each sound
  sounds.forEach(function(sound) {
    game.load.audio(sound, 'assets/sound/'+sound+'.mp3');
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

function playSound(sound, noClobber) {
  if (noClobber && audio[sound].isPlaying) {
    return;
  }
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
  // flag.body.mass = 0; // Make it stay where it is
  flag.body.setZeroVelocity();
  flag.body.x = currentLevel.flag[0];
  flag.body.y = currentLevel.flag[1];

  // Set initial positions
  player.body.setZeroVelocity();
  player.body.x = currentLevel.player[0];
  player.body.y = currentLevel.player[1];

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
  startText = game.add.text(game.width/2, game.height/2);
  startText.fixedToCamera = true;
  startText.anchor.setTo(0.5, 0.5);

  startText.font = FONT;
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
  game.physics.startSystem(Phaser.Physics.P2JS);
  game.physics.p2.gravity.y = GRAVITY;

  // Same as bottom of background
  game.stage.backgroundColor = '#261e11';
  bg = game.add.image(0, 0,  'background-'+currentLevel.background.name);
  bg.fixedToCamera = true;

  map = game.add.tilemap(currentLevel.map);
  map.addTilesetImage('tiles-'+currentLevel.tiles);

  // Background layer
  background = map.createLayer('Background');
  background.resizeWorld();

  // Collision layer
  objects = game.physics.p2.convertCollisionObjects(map, 'Objects');

  // Setup player
  player = game.add.sprite(128, 128, 'vectorman');
  player.anchor.setTo(0.5, 0); // So it flips around its middle
  game.physics.p2.enable(player);

  player.body.fixedRotation = true; // Never rotate
  // player.body.setCircle(32, 0, 16); // Circular collision body
  player.body.setRectangle(42, 50, 0, 16); // Rectangular collision body

  // Foreground layer
  foreground = map.createLayer('Foreground');
  foreground.resizeWorld();

  // Game sprites
  flag = game.add.sprite(128, 128, 'flag');
  flag.animations.add('wave', spriteRange(0, 29), ANIMATIONSPEED, true);
  flag.animations.play('wave');
  game.physics.p2.enable(flag);
  flag.body.setRectangleFromSprite(flag); // Size of sprite
  flag.body.fixedRotation = true; // Never rotate
  flag.body.kinematic = true; // Immovable

  // Check for collisions with the flag
  game.physics.p2.setPostBroadphaseCallback(checkFlagContact, this);

  // Setup animations
  for (var animationName in animations) {
    var animationFrames = animations[animationName];
    player.animations.add(animationName, spriteRange(animationFrames[0]-1, animationFrames[1]-1), ANIMATIONSPEED, animationFrames[2]);
  }

  game.camera.follow(player);

  // Controls
  cursors = game.input.keyboard.createCursorKeys();
  jumpKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
  pauseKey = game.input.keyboard.addKey(Phaser.Keyboard.P);
  resetKey = game.input.keyboard.addKey(Phaser.Keyboard.R);

  // Touch controls
  game.input.multiInputOverride = Phaser.Input.TOUCH_OVERRIDES_MOUSE;

  // Start game
  reset();

  if (typeof currentLevel.setup === 'function') {
    currentLevel.setup();
  }


  // Only show buttons on touchscreen
  if ('ontouchstart' in window) {
    buttons = game.add.group();
    buttons.alpha = 0.50;

    buttons.visible = true;

    var buttonXStart = 32;
    var buttonXEnd = game.width - 32;
    var buttonY = game.height - 128;
    var buttonWidth = 96;
    var buttonSpacing = buttonWidth + 24;

    addButton('button-left', buttonXStart, buttonY, function() {
      cursors.left.isDown = true;
    }, function() {
      cursors.left.isDown = false;
    });

    addButton('button-right', buttonXStart + buttonSpacing, buttonY, function() {
      cursors.right.isDown = true;
    }, function() {
      cursors.right.isDown = false;
    });

    addButton('button-circle', buttonXEnd - buttonWidth, buttonY, function() {
      jumpKey.isDown = true;
    }, function() {
      jumpKey.isDown = false;
    });

    addButton('button-down', buttonXStart + buttonSpacing/2, buttonY + buttonSpacing/2, function() {
      cursors.down.isDown = true;
    }, function() {
      cursors.down.isDown = false;
    });

    // CocoonJS fix: Doesn't like to draw the last sprite added
    this.game.add.sprite(0,0,'');

    document.addEventListener('touchstart', function(event) {
      for (var i = 0; i < event.touches.length; i++) {
        var touch = event.touches[i];
        var x = touch.clientX - game.canvas.offsetLeft;
        var y = touch.clientY - game.canvas.offsetTop;

        onTouchStart(x, y, touch.identifier);
      }
    });

    document.addEventListener('touchend', function(event) {
      for (var i = 0; i < event.changedTouches.length; i++) {
        var touch = event.changedTouches[i];
        var x = touch.clientX - game.canvas.offsetLeft;
        var y = touch.clientY - game.canvas.offsetTop;

        onTouchEnd(x, y, touch.identifier);
      }
    });
  }
}

function onTouchEnd(x, y, touchID) {
  for (var i = 0; i < buttons.children.length; i++) {
    var button = buttons.children[i];
    if (button.touchID === touchID) {
      button.onUp();
    }
  }
}

function onTouchStart(x, y, touchID) {
  for (var i = 0; i < buttons.children.length; i++) {
    var button = buttons.children[i];
    if (x > button.x - game.camera.x &&
        x < button.x - game.camera.x + button.width &&
        y > button.y - game.camera.y &&
        y < button.y - game.camera.y + button.height) {
      button.onDown();
      button.touchID = touchID;
    }
  }
}

function addButton(sprite, x, y, onDown, onUp) {
  var button = game.add.sprite(0, 0, sprite);
  button.fixedToCamera = true;
  button.cameraOffset.x = x;
  button.cameraOffset.y = y;
  button.onDown = onDown;
  button.onUp = onUp;
  buttons.add(button);
  return button;
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

  var onFloor = touches.down;

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

function objectsAreTouching(object1, object2) {
  for (var i = 0; i < game.physics.p2.world.narrowphase.contactEquations.length; i++) {
    var equation = game.physics.p2.world.narrowphase.contactEquations[i];
    if ((equation.bodyA === object1 || equation.bodyA === object2) && (equation.bodyB === object1 || equation.bodyB === object2)) {
      return true;
    }
  }
  return false;
}

function getTouches(object) {
  var yAxis = p2.vec2.fromValues(0, 1);
  var xAxis = p2.vec2.fromValues(1, 0);
  var up = false;
  var down = false;
  var left = false;
  var right = false;
  for (var i = 0; i < game.physics.p2.world.narrowphase.contactEquations.length; i++) {
    var equation = game.physics.p2.world.narrowphase.contactEquations[i];
    // Look for our target object
    if (equation.bodyA === object.body.data || equation.bodyB === object.body.data) {
      var dY = p2.vec2.dot(equation.normalA, yAxis); // Normal dot Y-axis
      var dX = p2.vec2.dot(equation.normalA, xAxis); // Normal dot X-axis

      if (equation.bodyA === object.body.data) {
        // Reverse the direction according to what side of the equation we're on
        dX *= -1;
        dY *= -1;
      }

      if (dX > 0.5) {
        right = true;
      }
      else if (dX < -0.5) {
        left = true;
      }

      if (dY > 0.5) {
        down = true;
      }
      else if (dY < -0.5) {
        up = true;
      }
    }
  }

  return {
    up: up,
    down: down,
    left: left,
    right: right
  };
}

function update() {
  touches = getTouches(player);

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

  var headHit = touches.up;
  var onFloor = touches.down;
  var onWallLeft = touches.left;
  var onWallRight = touches.right;

  if (Math.abs(player.body.velocity.x)) {
    player.body.velocity.x *= VELOCITYDAMPING;
  }

  if (headHit) {
    playSound('head bump', true);
  }

  if (mode === 'jump' && onFloor) {
    // Do this in case we start runnning before we land
    playSound('land', true);
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
        // Get off the ground
        player.body.y -= 1;

        player.body.velocity.y = -1 * JUMPVELOCITY;
        mode = 'jump';
        player.animations.play('jump');
      }
      else if ((onWallLeft || onWallRight) && player.body.velocity.y <= MAXWALLJUMPVELOCITY) {
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

  if (levelComplete) {
    // Make the flag fall
    flag.body.velocity.x = -100;
    if (flag.body.velocity.y < 500) {
      flag.body.velocity.y += 15;
    }
  }
}

function handleLevelComplete() {
  if (levelComplete) {
    return;
  }
  levelComplete = true;

  var levelTime = (game.time.now - levelStartTime) / 1000;

  var message = 'level '+(currentLevelIndex+1);
  var passed = levelTime < currentLevel.par;

  message += ' ' + (passed ? 'passed' : 'failed') + '\n';
  message += 'time: '+levelTime.toFixed(3)+'s\n'
  message += Math.abs(currentLevel.par - levelTime).toFixed(3) + 's '+(passed ? 'under' : 'over')+' par\n';

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

  // Stop the player
  // player.body.setZeroVelocity();

  levelText = game.add.text(game.width/2, game.height/2, message);
  levelText.fixedToCamera = true;
  levelText.anchor.setTo(0.5);

  levelText.font = FONT;
  levelText.fontSize = 60;

  levelText.fill = 'white';

  levelText.align = 'center';
  levelText.stroke = '#000000';
  levelText.strokeThickness = 2;
  levelText.setShadow(5, 5, 'rgba(0,0,0,0.5)', 5);

  // Restart or go to next level
  resetTimeout = setTimeout(passed ? nextLevel : reset, LEVELPAUSETIME);
}

function checkFlagContact(body1, body2) {
  var isPlayer = body1 === player.body || body2 === player.body;
  var isFlag = body1 === flag.body || body2 === flag.body;
  if (isPlayer && isFlag) {
    // End level
    handleLevelComplete();

    // Stop collision
    return false;
  }
  else if (isFlag) {
    // Flag cannot collide
    return false;
  }

  // Let collision happen
  return true;
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
