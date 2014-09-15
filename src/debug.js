(function() {
  var $;
  var create;
  var tweakers;

  function createSpinner(name, initial, cb) {
    var label = create('label');
    var input = create('input');
    label.textContent = name;
    label.className = 'ValueTweaker';
    input.type = 'number';
    input.value = initial;
    input.addEventListener('change', function() {
      var value = parseFloat(this.value);
      cb(value);
    });
    label.appendChild(input);
    tweakers.appendChild(label);
  }

  function createButton(name, cb) {
    var button = create('button');
    button.textContent = name;
    button.addEventListener('click', cb);
    tweakers.appendChild(button);
  }

  function debug() {
    game.debugMode = true;
    objects.debug = true;
    player.body.debug = true; // Show collision box
  }

  function stopMusic() {
    game.sound.remove(music);
  }

  function tweak() {
    $ = document.querySelector.bind(document);
    create = document.createElement.bind(document);
    tweakers = create('div');
    tweakers.className = 'Tweakers';
    document.body.appendChild(tweakers);

    createSpinner('Gravity', GRAVITY, function(value) {
      game.physics.arcade.gravity.y = value;
    });

    createSpinner('Jump Velocity', JUMPVELOCITY, function(value) {
      JUMPVELOCITY = value;
    });

    createSpinner('Boost Velocity', BOOSTVELOCITY, function(value) {
      BOOSTVELOCITY = value;
    });

    createSpinner('Run Start Speed', RUNSTARTSPEED, function(value) {
      RUNSTARTSPEED = value;
    });

    createSpinner('Run Full Speed', RUNFULLSPEED, function(value) {
      RUNFULLSPEED = value;
    });

    createSpinner('Velocity Damping', VELOCITYDAMPING, function(value) {
      VELOCITYDAMPING = value;
    });

    createSpinner('Max Boosts', MAXBOOSTS, function(value) {
      MAXBOOSTS = value;
    });

    createButton('Reset Position', function() {
      player.x = currentLevel.player[0];
      player.y = currentLevel.player[1];
    });
  }

  window.tweak = tweak;
  window.debug = debug;
  window.stopMusic = stopMusic;

  if (window.location && window.location.hash) {
    if (window.location.hash.match('tweak')) {
      tweak();
    }

    if (window.location.hash.match('debug')) {
      debug();
    }
  }
}());
