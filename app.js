
'use strict';

const config = require('./config.json');
const async = require('async');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const Iron = require('iron');
const leaderBoard = require('./server/leaderBoard');

const Games = require('./server/multiplayer');
const defaultGame = Games.createGame(config.board.width, config.board.height, config.board.mines, 'Default game');
defaultGame.doNotDelete = true;
defaultGame.unhide();

io.on('connection', (socket) => {
  var username;
  var game;
  var bot;
  //function to reveal square
  var revealSquare = function(coord,playername) {
    //disables the call untill the new game is loaded
    if (game.resetting)
      return;
    //updates the changed square to all the users in the same room
    io.to(game.gameId).emit('squares', game.reveal(coord.x, coord.y, playername));
    //updates the flag count to all the users in the room
    io.to(game.gameId).emit('flag count', game.getBoard().flagCount);
    //sends player details in the room to update scoreboard
    io.to(game.gameId).emit('players', game.getPlayers());

    if (game.getBoard().lost) io.to(game.gameId).emit('lose', {
      loser: game.getPlayer(playername).displayName,
      squares: game.getBoard().getRemainingSquares()
    });
    if (game.getBoard().won){
      io.to(game.gameId).emit('win', game.getWinner());
      leaderBoard.addScoreToPlayer(game.getWinner(), game.getBoard().getTime());
    } 
    //reloads the board after the end of each game having the same connected players
    if (game.getBoard().lost || game.getBoard().won) {
      game.resetting = true;
      setTimeout(() => {
        game.resetBoard();
        if(bot!==undefined) game.removePlayer(bot.username);
        bot = undefined;
        //clear points of all the players after the game is over
        game.clearPlayerPoints();
        //connected players still remain and can continue in the new game
        game.removeDisconnectedPlayers();
        game.resetting = false;
        io.to(game.gameId).emit('players', game.getPlayers());
        io.to(game.gameId).emit('board', {
          board: game.getBoard().getSquaresForPlayer(),
          dimensions: game.getBoard().getDimensions()
        });
        io.to(game.gameId).emit('flag count', game.getBoard().flagCount);
        Games.removeUnoccupiedGames();
      }, 5000);
    }
  };
  /**
   * @param {object} coord contains the x and y (coord.x, coord.y)cordinates of the square clicked
   * updates flagged status to all users in the room
   */
  var flagSquare = function (coord) {
    game.toggleFlag(coord.x, coord.y);
    io.to(game.gameId).emit('flag count', game.getBoard().flagCount);
    io.to(game.gameId).emit('squares', [game.getBoard().getSquaresForPlayer()[coord.x][coord.y]]);
  };
  /**
   * @param {number} sleeptime in milli seconds time to pause after each move
   * @param {string} playername player
   * gets next move(AI solver) from the current status of the board 
   */
  var getNextBotMove= async function (sleeptime,playername){
    const ai = require('./server/Solver');
    const solver = new ai(game.board);

    var coord;
    while(!game.resetting){
      coord = solver.getNextMove();
      coord.status == 'click'? revealSquare(coord,playername):flagSquare(coord);
      await sleep(sleeptime);
    }
  }
  socket.on('login', (credentials) => {
    async.series([(callback) => {
      // unseal the username (if it's there)
      if (credentials.sealedUsername)
        Iron.unseal(credentials.sealedUsername, config.password, Iron.defaults, (err, unsealed) => {
          username = unsealed;
          if (err) {
            console.warn(`Tampered with their username: ${err.message}`);
          }
          callback();
        });
      else
        callback();
    }, (callback) => {
    
      game = Games.getGame(credentials.gameId);

      //joins the user to the default(global game) if game Id doesnt exist
      if (!game) {
        if (credentials.gameId)
          game = Games.createGame(config.board.width, config.board.height, config.board.mines,'new game',credentials.gameId);
        else game = defaultGame;
      }
      //joins the user to default game if the given game is single player mode(solo) 
      else if (game.solo && bot!==undefined && Object.keys(game.getPlayers()).length!=0 && socket.emit('warning', 'Can not enter game, Game is private')){
        game = defaultGame; // redirected to defaultGame
      }
      //creates a new player(hri names) and adds player to the game
      username = game.addPlayer(username).username;
      //joins the user to the room with room name same as gameId
      socket.join(game.gameId);
      console.info(`Connected with username ${username} to game ${game.gameId}`);

      Iron.seal(username, config.password, Iron.defaults, (err, sealedUsername) => {
        socket.emit('set username', {
          username: username,
          sealedUsername: sealedUsername
        });
        io.to(game.gameId).emit('players', game.getPlayers());
        socket.emit('board', {
          board: game.getBoard().getSquaresForPlayer(),
          dimensions: game.getBoard().getDimensions()
        });
        io.to(game.gameId).emit('squares', game.board.getSquaresByPlayer(username));
        socket.emit('flag count', game.getBoard().flagCount);
        socket.emit('next dimensions', game.getNextDimensions());
        socket.emit('share game', {
          name: game.name,
          hidden: game.hidden,
          isDefaultGame: game == defaultGame
        });
      });
    }]);
  });

  socket.on('hint', () => {
    const ai = require('./server/Solver');
    const solver = new ai(game.board);

    var coord = solver.getNextMove();
    coord.status == 'click'? revealSquare(coord,username):flagSquare(coord);
  });
  /**
   * @param {number} ms time in milli seconds to pause each step of AI-Solver
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  // adds a bot per game and each step of it has a delay of 2 seconds
  socket.on('playWithBot', async()=>{
    if(bot===undefined){
      bot = game.addPlayer();
      game.updatePlayerDisplayName(bot.username, 'bot');
      getNextBotMove(2000,bot.username);
    }
    else socket.emit('warning','bot already added');
  });
  socket.on('autoSolve',async ()=>{
    getNextBotMove(1000,username);
  });

  socket.on('updateDisplayName', (data) => {
    game.updatePlayerDisplayName(username, data.displayName);
    io.to(game.gameId).emit('players', game.getPlayers());
  });
  socket.on('reveal', (coord) => {
    revealSquare(coord,username);
  });
  socket.on('flag', (coord) => {
    flagSquare(coord);
  });

  //chat room
  socket.on('msg to chatroom', function(msg){
    io.to(game.gameId).emit('msg from chatroom', {
      displayName: game.getPlayer(username).displayName,
      username: username,
      text: msg,
      color: game.getPlayer(username).color
    });
  });
  //deletes a game if there are no connected players
  socket.on('disconnect', async (message) => {
    if (game){
      game.playerDisconnected(username);
      // if(game.solo){
      await sleep(15000);
      Games.removeGameBygameId(game.gameId);
      // }
      // else{
        // Games.removeUnoccupiedGames();
      // }
    }
    console.debug('Disconnected');
  });
  socket.on('next dimensions', (dimensions) => {
    if (dimensions.width > 0 && dimensions.height > 0 && dimensions.width <= 40 && dimensions.height <= 40) {
      game.setNextDimensions(dimensions);
      io.to(game.gameId).emit('next dimensions', game.getNextDimensions());
    }
  });
  socket.on('share game', (shareData) => {
    if (game == defaultGame)
      return;
    var name = shareData.name;
    var hidden = shareData.hidden;
    game.solo = false;// shared game can not be made as a solo game
    game.name = name;
    game.hidden = hidden;
    io.to(game.gameId).emit('share game', {
      name: game.name,
      hidden: game.hidden,
      isDefaultGame: game == defaultGame
    });
  });
  socket.on('mouse in', (coord) => { });
  socket.on('mouse out', (coord) => { });
});
// ----------------------------------------------------------------------------------------------------------------------------------
app.set('view engine', 'pug');

app.get('/', (req, res) => {
  res.render('index');
});
//response is lobby(avialable shared games) page
app.get('/games', (req, res) => {
  res.render('games', {
    Games: Games
  });
});
//response is leaderboard page 
app.get('/leader_board', (req, res) => {
  res.render('leaderBoard', {
    Scores: leaderBoard.getScores()
  });
});
//creates a new game and redirects the user to it
app.get('/new', (req, res) => {
  console.log('/new');
  var game = Games.createGame();
  console.debug(`Game ${game.gameId} created in response to ${req.connection.remoteAddress}`);
  res.redirect(`/?g=${game.gameId}`);
});
// returns minimize.js (uglified client.js) when client.js is called
app.get('/client.js', (req, res) => {
  res.sendFile(__dirname + '/client/minimize.js');
});
app.get('/favicon.png', (req, res) => {
  res.sendFile(__dirname + '/img/favicon.png');
});
app.get('/logo.png', (req, res) => {
  res.sendFile(__dirname + `/img/logo.png`);
});
app.get('/style.css', (req, res) => {
  res.sendFile(__dirname + '/css/style.css');
});
// --fetches node modules required in front end
app.get('/js.cookie.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/js-cookie/src/js.cookie.js');
});
app.get('/socket.io.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/socket.io-client/dist/socket.io.js');
});
app.get('/jquery.min.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/jquery/dist/jquery.min.js');
});
app.get('/materialize.min.css', (req, res) => {
  res.sendFile(__dirname + '/node_modules/materialize-css/dist/css/materialize.min.css');
});
app.get('/materialize.min.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/materialize-css/dist/js/materialize.min.js');
});
app.get('/fonts/roboto/Roboto-Regular.woff2', (req, res) => {
  res.sendFile(__dirname + '/node_modules/materialize-css/dist/fonts/roboto/Roboto-Regular.woff2');
});
app.get('/fonts/roboto/Roboto-Bold.woff2', (req, res) => {
  res.sendFile(__dirname + '/node_modules/materialize-css/dist/fonts/roboto/Roboto-Bold.woff2');
});
app.get('/fonts/roboto/Roboto-Light.woff2', (req, res) => {
  res.sendFile(__dirname + '/node_modules/materialize-css/dist/fonts/roboto/Roboto-Bold.woff2');
});
http.listen(process.env.PORT || config.port, () => {
  console.info(`MineSweeper started on http://localhost:${config.port}`);
});
