var milliseconds = 0;
var seconds = 0;
var minutes = 0;

var displayMilliseconds = 0;
var displaySeconds = 0;
var displayMinutes = 0;

var interval = null;
var timegap = 0;

var status = "stopped";

function stopWatch() {
  milliseconds++;
  if (milliseconds / 100 == 1) {
    milliseconds = 0;
    seconds++;
  }

  if (seconds / 60 == 1) {
    seconds = 0;
    minutes++;
  }

  if (milliseconds < 10) {
    displayMilliseconds = "0" + milliseconds.toString();
  }
  else if (milliseconds < 100) {
    displayMilliseconds = milliseconds.toString();
  }
  else {
    displayMilliseconds = milliseconds;
  }


  if (seconds < 10) {
    displaySeconds = "0" + seconds.toString();
  }
  else {
    displaySeconds = seconds;
  }

  if (minutes < 10) {
    displayMinutes = "0" + minutes.toString();
  }
  else {
    displayMinutes = minutes;
  }



  document.getElementById("display").innerHTML = displayMinutes + ":" + displaySeconds + ":" + displayMilliseconds;

}


function startStop(){
		if(status === "stopped"){
		//Start the stopwatch (by calling the setInterval() function)
		if ( timegap == 0 ){
				timegap = 10;
				interval = window.setInterval(stopWatch, timegap);
				//document.getElementById("startStop").innerHTML = "Stop";
				status = "started";
			}
        }

}


//Function to reset the stopwatch
function reset() {

    window.clearInterval(interval);
    milliseconds = 0;
    seconds = 0;
    minutes = 0;
    document.getElementById("display").innerHTML = "00:00:00";
    status="stopped";
    //document.getElementById("startStop").innerHTML = "Start";
	//timegap = 0;

}

var socket = io();
var board;
var username = Cookies.get('username');
var displayName = Cookies.get('display_name');
var color;
var users = {};
var points_cookie = Cookies.get('points');
var currentMouseLocation;
var viewMouseLocations = false;
var gameName = 'Unnamed game';
var hidden = true;



var getGameId = function () {
  var parts = window.location.search.substring(1).split('=');
  var object = {};
  for (var i = 0; i < parts.length - 1; i += 2) {
    object[parts[i]] = parts[i + 1];
  }
  return object.g;
};

var register = function () {

  if (displayName == undefined) {
    displayName = prompt("Please enter your name", "Harry Potter");
  }
  Cookies.set('display_name', displayName);
  socket.emit('login', {
    sealedUsername: Cookies.get('username'),
    displayName: displayName,
    gameId: getGameId()
  });
};
var updateDisplayName=function(){
  socket.emit('updateDisplayName',{
    sealedUsername:username,
    displayName: Cookies.get('display_name')
  });
}
var shuffle = function (array) {
  var swap = function (pos1, pos2) {
    var save = array[pos1];
    array[pos1] = array[pos2];
    array[pos2] = save;
  };

  for (var i = 0; i < array.length; i++) {
    var randomIndex = Math.floor(Math.random() * (array.length - i)) + i;
    swap(i, randomIndex);
  }

  return array;
};

socket.on('connect', register);
socket.on('invalid gameId', function () {
  window.location = '/new';
});
socket.on('set username', function (data) {
  username = data.username;
  Cookies.set('username', data.sealedUsername);
  updateDisplayName();

});

socket.on('points cookie', function (data) {
  Cookies.set('points', data.data);
});

socket.on('flag count', function (count) {
  $('#flagCount').text(count);
});

socket.on('board', function (board_data) {
  $('#board').empty();
  timegap = 0; //timer only starts after game data populated
  board = board_data.board;

  $('#currentDimensions').text(dimensionsToString(board_data.dimensions));

  var modified_squares = [];
  for (var y in board[0]) {
    for (var x in board) {
      $('#board').append($('<span class="square"></span>').prop('id', x + '-' + y).click(function () {

        if (isCurrentlyRevealMode()) {
          socket.emit('reveal', {
            x: parseInt($(this).prop('id').split('-')[0]),
            y: parseInt($(this).prop('id').split('-')[1])
          });
          if (minutes == 0 && seconds == 0 && milliseconds == 0) {
            startStop();
          }

        }
        else {

          socket.emit('flag', {
            x: parseInt($(this).prop('id').split('-')[0]),
            y: parseInt($(this).prop('id').split('-')[1])
          });
          if (minutes == 0 && seconds == 0 && milliseconds == 0) {
            startStop();
          }
        }
      }).on('contextmenu', function () {
        socket.emit('flag', {
          x: parseInt($(this).prop('id').split('-')[0]),
          y: parseInt($(this).prop('id').split('-')[1])
        });
        return false;
      }));

      if (board[x][y].flagged || board[x][y].revealed)
        modified_squares.push(board[x][y]);
    }
  }

  var adjustBoardSizeToFit = function () {
    var smallestSideLength = Math.min($(window).height(), $(window).width());
    var squareSize = (smallestSideLength - 80) / Math.max(board_data.dimensions.width, board_data.dimensions.height);
    var marginSize = Math.max(1, Math.floor(squareSize / 50));
    $('#board').css('width', (squareSize + (marginSize * 2)) * board_data.dimensions.width);
    $('.square').css('width', squareSize);
    $('.square').css('height', squareSize);
    $('.square').css('borderRadius', squareSize / 10);
    $('.square').css('margin', marginSize);
    $('.square').css('fontSize', squareSize * 0.64);
  };
  $(window).on('load resize', adjustBoardSizeToFit);
  adjustBoardSizeToFit();

  $('.square').hover(function () {
    var coord = {
      x: parseInt($(this).prop('id').split('-')[0]),
      y: parseInt($(this).prop('id').split('-')[1])
    };
    currentMouseLocation = coord.x + '-' + coord.y;
    $(this).css('border-color', color);
    if (viewMouseLocations)
      socket.emit('mouse in', coord);
  },
    function () {
      var coord = {
        x: parseInt($(this).prop('id').split('-')[0]),
        y: parseInt($(this).prop('id').split('-')[1])
      };
      currentMouseLocation = null;
      $(this).css('border-color', 'black');
      if (viewMouseLocations)
        socket.emit('mouse out', coord);
    });

  updateSquaresWithDelay(shuffle(modified_squares));
});

var dimensionsToString = function (dimensions) {
  $('#currentDimensions').text(dimensions.mines);
  //return dimensions.width + ' by ' + dimensions.height + ' with ' + dimensions.mines + ' mines';
};

socket.on('next dimensions', function (dimensions) {
  //$('#nextDimensions').text(dimensionsToString_(dimensions));
});

var updateColor = function () {
  $('#display_name').text(displayName).css('font-weight', 600).css('color', color);
};

var isCurrentlyRevealMode = function () {
  return $('#revealMode').is(':checked');
};

var updateSquare = function (square) {
  //timegap = 0;
  var getSymbolForSquare = function (square) {
    if (square.mine || !square.revealed)
      return (square.flagged) ? '🚩' : '';
    return (square.count == 0) ? '' : square.count;
  };

  var symbol = getSymbolForSquare(square);
  $('#' + square.x + '-' + square.y).text(symbol);

  if (square.mine) {
    $('#' + square.x + '-' + square.y).text('💣');

  } else if (!square.revealed) {
    // do nothing
  } else if (square.revealedBy != 'default') {
    var color;
    if (users[square.revealedBy]) {
      color = users[square.revealedBy].color;
    } else {
      color = 'white';
      register();
    }
    $('#' + square.x + '-' + square.y).css('background-color', color);
  } else if (square.revealedBy == 'default') {
    $('#' + square.x + '-' + square.y).css('background-color', '#eeeeee');
  }

  if (square.lose == true) {
    $('#' + square.x + '-' + square.y).css('opacity', 0.1);
  }
};

var updateSquares = function (squares) {
  for (var i in squares)
    updateSquare(squares[i]);
};
var updateSquaresWithDelay = function (squares) {

  if (getPreferences().delay == 0)
    return updateSquares(squares);

  var delay = 1;
  if (getPreferences().delay)
    delay = getPreferences().delay;

  if (squares.length <= 0)
    return;

  updateSquare(squares[0]);

  setTimeout(function () {
    updateSquaresWithDelay(squares.splice(1));
  }, delay);

};

socket.on('players', function (players) {
  users = players;
  $('#scoreboard').empty();

  var foundSelf = false;
  for (var name in users) {
    if (name == username) {
      foundSelf = true;
      color = users[name].color;
      updateColor();
    }
    $('#scoreboard').append($('<div class="row"></div>').append($('<div class="col s10"></div>').text(users[name].displayName).css('color', users[name].color)).append($('<div class="col s2"></div>').text(users[name].points).prop('id', name)).css('font-size', 22));
  }

  if (!foundSelf) {
    register();
  }
});

socket.on('mouse locations', function (locations) {
  if (!viewMouseLocations)
    return;

  for (var x in board) {
    for (var y in board[x]) {
      if (currentMouseLocation == x + '-' + y)
        continue;

      if (locations[x + '-' + y])
        $('#' + x + '-' + y).css('border-color', users[locations[x + '-' + y]].color);
      else
        $('#' + x + '-' + y).css('border-color', 'white');
    }
  }
});

socket.on('squares', function (squares) {
  updateSquaresWithDelay(shuffle(squares));
});
socket.on('lose', function (info) {
  var loser = info.loser;
  var squares = info.squares;
  updateSquares(squares);
  M.toast({
    html: loser + ' hit a mine!',
    displayLength: 5000,
    classes: 'red'
  });
  reset();

});

socket.on('win', function (winners) {
  if(winners.length!=0){
    winners.forEach(function(winner){
      M.toast({
        html: winner.displayName + ' won the game! in '+ minutes+':' +seconds+':'+milliseconds +'s',
        displayLength: 5000,
        classes: 'green'
      });
    },winners);
    
    reset();
  }
});
socket.on('reconnect', register);

var defaultPreferences = {
  delay: 5
};
var updateSettingsModal = function () {
  $('#delay').val(getPreferences().delay);
  M.updateTextFields();
};
var getPreferences = function () {
  if (Cookies.get('preferences'))
    return JSON.parse(Cookies.get('preferences'));
  else
    return defaultPreferences;
};
var updatePreferences = function (field, value) {
  var preferences = getPreferences();
  preferences[field] = value;
  Cookies.set('preferences', preferences);
};
socket.on('share game', function (shareData) {
  gameName = shareData.name;
  hidden = shareData.hidden;
  if (shareData.isDefaultGame) {
    window.history.replaceState('Object', 'Title', '/');
    $('#name').prop('disabled', true);
    $('#public').prop('disabled', true);
  }
});

socket.on('warning', function(msg){
  M.toast({
    html: msg,
    displayLength: 5000,
    classes: 'red'
  });
});

var updateShareModal = function () {
  $('#name').val(gameName);
  $('#public').prop('checked', !hidden);
  M.updateTextFields();
};

$(function () {
  $('#hint').click(function () {
    socket.emit('hint');
    startStop();
  });
  $('#autoSolve').click(function () {
    socket.emit('autoSolve');
    startStop();
  });
  $('#submitSize').click(function () {
    socket.emit('next dimensions', {
      width: $('#width').val(),
      height: $('#height').val(),
      mines: $('#mines').val()
    });
  });
  $('.tooltipped').tooltip({
    delay: 50
  });
  $('.fixed-action-btn').floatingActionButton();
  $('.modal').modal();

  $('#delay').on('keyup change', function () {
    if (Math.abs(parseInt($('#delay').val())) == $('#delay').val() && Math.abs(parseInt($('#delay').val())) <= 20)
      updatePreferences('delay', $('#delay').val());
  });
  $('#settings-button').click(function () {
    updateSettingsModal();
  });

  $('#submitShare').click(function () {
    socket.emit('share game', {
      name: $('#name').val(),
      hidden: !$('#public').is(':checked')
    });
  });
  $('#share-button').click(function () {
    updateShareModal();
  });
  $('#play-with-ai-button').click(function(){
    socket.emit('playWithBot');
    startStop();
  });

  $('#display_name').on('keypress', function (e) {
    if (e.keyCode == 13) {
      e.preventDefault();
      displayName = $("#display_name").text();
      Cookies.set('display_name', displayName);
      updateDisplayName();
    }
   
    e.stopPropagation();
   });
  // to customize grid size
  $("#beginnerMode, #intermediateMode, #expertMode, #customMode").change(function () {
    $("#width, #height, #mines").val("").attr("readonly", true);
    if ($("#beginnerMode").is(":checked")) {
      $("#width").val(8);
      $("#height").val(8);
      $("#mines").val(10);
    } else if ($("#intermediateMode").is(":checked")) {
      $("#width").val(16);
      $("#height").val(16);
      $("#mines").val(40);
    } else if ($("#expertMode").is(":checked")) {
      $("#width").val(24);
      $("#height").val(24);
      $("#mines").val(99);
    } else if ($("#customMode").is(":checked")) {
      $("#width").removeAttr("readonly");
      $("#height").removeAttr("readonly");
      $("#mines").removeAttr("readonly");
    }
    else {
      $("#width, #height, #mines").val("").attr("readonly", true);
    }
  });

  updateSettingsModal();
  M.updateTextFields();
});

// chat room
$(function () {
  var arrow = $('.chat-head img');
  var textarea = $('.chat-text textarea');
  var objDiv = document.getElementById('ChatRoomID');
  $('.chat-body').slideUp('slow');
  arrow.on('click', function () {
    var src = arrow.attr('src');

    $('.chat-body').slideToggle('fast');
    if (src == 'https://maxcdn.icons8.com/windows10/PNG/16/Arrows/angle_down-16.png') {
      arrow.attr('src', 'https://maxcdn.icons8.com/windows10/PNG/16/Arrows/angle_up-16.png');
    }
    else {
      arrow.attr('src', 'https://maxcdn.icons8.com/windows10/PNG/16/Arrows/angle_down-16.png');
    }
  });

  textarea.keypress(function (event) {
    var $this = $(this);

    if (event.keyCode == 13) {
      if (!event.shiftKey) {
        var msg = $this.val();
        $this.val('');
        $('.msg-insert').append("<div class='msg-send'><div class='msg-displayName' style='color:"+ color+"'>You</div>"+"<div class='msg-text-display'>"+msg+"</div></div>");
        objDiv.scrollTop = objDiv.scrollHeight;
        socket.emit('msg to chatroom', msg);
      }
    }
  });

  socket.on('msg from chatroom',function(msg){
    if(msg.username != username)
    $('.msg-insert').append("<div class='msg-receive'><div class='msg-displayName' style='color:"+ msg.color+"'>"+msg.displayName+"</div>"+"<div class='msg-text-display'>"+msg.text+"</div></div>");
    objDiv.scrollTop = objDiv.scrollHeight;
  });

});
