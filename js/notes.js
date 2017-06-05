$(function() {
  var NOTES = ["F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E"];

  var randomSongLength = 10;
  var SONGS = {
    "Random": Array.apply(null, Array(randomSongLength)).map(function() {
        return [NOTES[randInt(0, NOTES.length - 1, true)], 1]
    }),
    "Happy Birthday": parseSong("0,4-0,8-2,4-4,4-4,4-4,2"),
    "Happy Birthday V2": parseSongDashed("0-0-2--0--5-4----0-0-2--0----7-5----0-0-9--7-5-4--2-2----10-10-9--5--7-5"),
  }

  function parseSong(encodedSong) {
    return encodedSong.split("-").map(function(fretDurationPair) {
      var [fret, duration] = fretDurationPair.split(",").map(function(el) {
        return parseInt(el, 10);
      });

      var note = fret === 0 ? "E" : NOTES[fret - 1];

      return [note, duration];
    });
  }

  function parseSongDashed(encodedSong) {
    let song = [];
    let duration = 0;
    let last_note;
    for (let i = 0; i < encodedSong.length; i++){
      if (encodedSong[i] != "-"){
        if (duration > 0){
          song.push([last_note, 8 / duration]);
        }

        let fret = parseInt(encodedSong[i]);
        last_note = fret === 0 ? "E" : NOTES[fret - 1];
        duration = 0;
      } else {
        duration += 1;
      }
    }
    return song;
  }

  function generateNextNote(songIndex, rockIndex) {
    var song = SONGS[songIndex];

    return SONG[rockIndex][0];
  }

  //canvas variables
  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");

  var explosion = new ExplosionEffect(ctx);

  // game variables
  var continueAnimating = false;
  var score = 50;

  // block variables
  var blockWidth = canvas.width;
  var blockHeight = 50;
  var block = {
      x: 0,
      y: canvas.height - blockHeight,
      width: blockWidth,
      height: blockHeight
  }

  var highlightedFret;

  // rock variables
  var pegWidth = 2;
  var rockWidth = 50;
  var rockSpeed;
  var rockHeight = rockWidth;
  var eightsDurationDistance = rockHeight;
  var rocks = [];

  function initRocks(songIndex) {
    var song = SONGS[songIndex];
    var totalRocks = song.length;

    for (var i = 0; i < totalRocks; i++) {
      addRock(i, songIndex);
    }
  }

  function calculateRockY(rockIndex) {
    var prevRock = rockIndex === 0 ? rocks[rocks.length - 1] : rocks[rockIndex - 1];
    var minRockY = rocks.length === 0 ? 0 : Math.min.apply(Math, rocks.map(function(r){return r.y;}));

    return rocks.length === 0 ? 0 : minRockY - prevRock.durationDistance;
  }

  function addRock(rockIndex, songIndex) {
    var song = SONGS[songIndex];
    var rock = {
      width: rockWidth - pegWidth,
      height: rockHeight,
      durationDistance: eightsDurationDistance * 8 / song[rockIndex][1]
    }

    var prevRock = rockIndex === 0 ? rocks[rocks.length - 1] : rocks[rockIndex - 1];

    rock.note = song[rockIndex][0];

    var noteIndex = NOTES.findIndex(function(note) {
      return note == rock.note;
    });

    rock.x = noteIndex * rockWidth + pegWidth;

    resetRock(rock, rockIndex);
    rocks.push(rock);
  }

  function resetRock(rock, rockIndex) {
    rock.y = calculateRockY(rockIndex)
  }

  // fps options
  var fps, fpsInterval, startTime, now, then, elapsed;

  $(document).on("note_detected", function(event, note, freq, error) {
    note = note[1];
    highlightFret(note);

    var rockIndex = rocks.findIndex(function(r) {
      return r.y >= canvas.height - blockHeight - rockHeight;
    });

    if(rockIndex === -1) {
      return;
    }

    var rock = rocks[rockIndex];

    if(!isColliding(block, rock)) {
      return;
    }

    var correctAnswer = note === rock.note;

    if(correctAnswer) {
      score += 10;
    } else {
      score -= 10;
    }

    explosion.add(rock.x, rock.y, correctAnswer)

    var currentY = rock.y;

    resetRock(rock, rockIndex);
  });

  function highlightFret(note) {
    var fretIndex = NOTES.findIndex(function(n) {
      return note === n;
    });

    highlightedFret = fretIndex;

    setTimeout(function() {
      highlightedFret = undefined;
    }, 100);
  }

  function drawCircle(x, y) {
    var circleSize = (blockHeight / 6 - 1) / 2;

    ctx.fillStyle = "#FFF";
    ctx.beginPath();
    ctx.arc(x, y, circleSize, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawFretBoard() {
    ctx.fillStyle = "skyblue";
    ctx.fillRect(block.x, block.y, block.width, block.height);
    ctx.strokeStyle = "lightgray";
    ctx.strokeRect(block.x, block.y, block.width, block.height);

    for(var i = 0; i < NOTES.length; i++) {
      ctx.fillStyle = "#FFF";
      ctx.fillRect(i * rockWidth, block.y, pegWidth, block.height);
    }

    // draw single circles
    var circleFrets = [2, 4, 6, 8];
    var cirlceColor = "#FFF";
    var verticalMiddle = canvas.height - block.height / 2;
    var circleSize = (blockHeight / 6 - 1) / 2;

    circleFrets.forEach(function(fret) {
      drawCircle((rockWidth * fret - 1) + rockWidth / 2 + pegWidth, verticalMiddle);
    });

    // draw double circles
    var doubleCirclesFret = 12;
    drawCircle((rockWidth * 11) + rockWidth / 2 + pegWidth, canvas.height - circleSize * 2.5);
    drawCircle((rockWidth * 11) + rockWidth / 2 + pegWidth, canvas.height - blockHeight + 2.5 * circleSize);

    if(typeof(highlightedFret) === "number") {
      ctx.fillStyle = "#F991CC";
      ctx.fillRect(highlightedFret * rockWidth, block.y, rockWidth - pegWidth, rockHeight);
    }
  }

  function animate() {
    if (continueAnimating) {
      requestAnimationFrame(animate);
    }

    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
      // Get ready for next frame by setting then=now, but also adjust for your
      // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
      then = now - (elapsed % fpsInterval);

      // Drawing code
      for (var i = 0; i < rocks.length; i++) {
        var rock = rocks[i];

        rock.y += rockSpeed;

        if (rock.y > canvas.height) {
          score -= 10;

          explosion.add(rock.x, canvas.height - 5, false);

          resetRock(rock, i);
        }
      }

      drawAll();
    }
  }

  function isColliding(a, b) {
    return !(
      b.y > a.y + a.height ||
      b.y + b.height < a.y
    );
  }

  function drawAll() {
    // clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw the background
    ctx.fillStyle = "ivory";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw the Fretboard block
    drawFretBoard();

    // draw all rocks
    for (var i = 0; i < rocks.length; i++) {
      var rock = rocks[i];
      ctx.fillStyle = "#FFA100";
      ctx.fillRect(rock.x, rock.y, rock.width, rock.height);

      ctx.font = "28px Times New Roman";
      ctx.fillStyle = "#FFF";
      ctx.textAlign="center";
      ctx.textBaseline = "middle";
      ctx.fillText(rock.note, rock.x + 25, rock.y + 25);
    }

    $score.text(score);

    explosion.draw();
  }

  var $game = $(".real-guitar-hero"),
      $startButton = $game.find(".start-game"),
      $bpmInput = $game.find(".real-guitar-hero__bpm-input"),
      $songSelect = $game.find(".real-guitar-hero__song-select"),
      $score = $game.find(".real-guitar-hero__score");

  // show songs options
  for(song in SONGS) {
    var $option = $("<option/>");
    $option.val(song);
    $option.text(song);

    if(song === "Random") {
      $option.attr("selected", "selected");
    }

    $songSelect.append($option);
  }

  $startButton.on("click", function () {
    var beatDuration = 60 / $bpmInput.val(),
        fps = 30;

    rockSpeed = eightsDurationDistance * 8 / (fps * beatDuration);

    var songIndex = $songSelect.val();

    initRocks(songIndex);

    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    continueAnimating = true;
    animate();
  });
});
