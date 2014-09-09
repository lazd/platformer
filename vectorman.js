
var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload() {

  game.load.tilemap('level1', 'assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
  game.load.image('tiles-1', 'assets/tiles-1.png');
  game.load.spritesheet('vectorman', 'assets/vectorman.png', 80, 80);
  game.load.spritesheet('droid', 'assets/droid.png', 32, 32);
  game.load.image('starSmall', 'assets/star.png');
  game.load.image('starBig', 'assets/star2.png');
  game.load.image('background', 'assets/background2.png');

}

var map;
var tileset;
var layer;
var player;
var mode = 'right';
var facing = 'right';
var runTimer = 0;
var cursors;
var jumpButton;
var bg;

function spriteMap(start, end) {
  var map = [];
  for (var i = start; i <= end; i++) {
  map.push(i);
  }
  return map;
}

function create() {

  game.physics.startSystem(Phaser.Physics.ARCADE);

  game.stage.backgroundColor = '#000000';

  bg = game.add.tileSprite(0, 0, 800, 600, 'background');
  bg.fixedToCamera = true;

  map = game.add.tilemap('level1');

  map.addTilesetImage('tiles-1');

  map.setCollisionByExclusion([ 13, 14, 15, 16, 46, 47, 48, 49, 50, 51 ]);

  layer = map.createLayer('Tile Layer 1');

  //  Un-comment this on to see the collision tiles
  layer.debug = true;

  layer.resizeWorld();

  game.physics.arcade.gravity.y = 500;

  player = game.add.sprite(128, 128, 'vectorman');
  player.anchor.setTo(0.5, 0); //so it flips around its middle

  game.physics.enable(player, Phaser.Physics.ARCADE);

  player.body.bounce.y = 0.1;
  player.body.collideWorldBounds = true;
  player.body.setSize(50, 50, 0, 30);

  // 60 FPS
  var spriteSpeed = 60;
  player.animations.add('idle', spriteMap(70, 100), spriteSpeed, true);

  player.animations.add('run-start', spriteMap(0, 25), spriteSpeed, false);
  player.animations.add('run', spriteMap(26, 58), spriteSpeed, true);

  player.animations.add('jumping', spriteMap(112, 140), spriteSpeed, false);

  player.animations.add('boost', spriteMap(134, 140), spriteSpeed, false);

  player.animations.add('fall', [140], spriteSpeed, false);

  player.animations.add('land', spriteMap(154, 170), spriteSpeed, false);

  game.camera.follow(player);

  cursors = game.input.keyboard.createCursorKeys();
  jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

// The time it takes to start running full speed
var timeToRun = 26/60 * 1000; // The number of frames in the start running animation

var landStart = 0;
var timeToLand = 16/60 * 1000;

// The time between jumps
var jumpTime = 250;
var jumpVelocity = 275;
var boostVelocity = 250;
var maxBoosts = 1;

// The number of boosts the player has used in flight
var boostCount = 0;

// The speed of running
var runStartSpeed = 180;
var runFullSpeed = 300;

var fullSpeed = false;

// The time when we can next boost
var jumpStart = 0;
var lastBoostTime = 0;
var jumpReleased = true;

function run(direction) {
  var additionalRunVelocity = 0;

  if (direction === 'right') {
    player.scale.x = -1;
  }
  else {
    player.scale.x = 1;
  }

  // If they switch direction or just start running
  if (mode !== 'running') {
    // Start a timer where we'll run at full speed
    runTimer = game.time.now + timeToRun;

    fullSpeed = false;
    mode = 'running';
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
    additionalRunVelocity = (1 - (runTimer - game.time.now) / timeToRun) * (runFullSpeed - runStartSpeed);
  }

  if (player.body.onFloor()) {
    // Switch the animation
    var animation = 'run' + (fullSpeed ? '' : '-start');

    player.animations.play(animation);
  }

  // Set speed
  player.body.velocity.x = (direction === 'left' ? -1 : 1) * ((fullSpeed ? runFullSpeed : runStartSpeed) + additionalRunVelocity);
}

function update() {

  game.physics.arcade.collide(player, layer);

  player.body.velocity.x = 0;

  var onFloor = player.body.onFloor();
  
  // When we touch the ground, reset boost count
  if (onFloor) {
    boostCount = 0;
    if (mode === 'jumping') {
      mode = 'land';
      player.animations.play('land');
      landStart = game.time.now;
    }
  }

  if (cursors.left.isDown) {
    run('left');
  }
  else if (cursors.right.isDown) {
    run('right');
  }
  else if (mode != 'land' || game.time.now > landStart + timeToLand) {
    if (onFloor) {
      player.animations.play('idle');
      mode = 'idle';
    }
    else if (mode !== 'jumping') {
      mode = 'jumping';
      player.animations.play('fall');
    }
  }

  // If we're:
    // not on the floor
    // not pressing jump
    // not over boost count
  var canBoost = false;
  if (jumpReleased && !onFloor && boostCount < maxBoosts) {
    canBoost = true;
  }

  if (jumpButton.isDown) {
    if (onFloor && jumpReleased) {
      player.body.velocity.y = -1 * jumpVelocity;
      jumpStart = game.time.now;
      mode = 'jumping';
      player.animations.play('jumping');
    }
    else if (jumpButton.isDown && canBoost) {
      player.body.velocity.y = -1 * boostVelocity;
      boostCount++;
      player.animations.play('boost');
    }

    jumpReleased = false;
  }
  else {
    jumpReleased = true;
  }

}

function render () {
  // game.debug.text(game.time.physicsElapsed, 32, 32);
  // game.debug.body(player);
  // game.debug.bodyInfo(player, 16, 24);
}