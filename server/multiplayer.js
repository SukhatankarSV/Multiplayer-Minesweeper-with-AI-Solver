'use strict';

const Game = require('./game');

const Games = function() {
  this.games = {};
};

Games.prototype.getGame = function(gameId) {
  return this.games[gameId];
};
/**
 * dimensions of the board
 * @param  {number} width width of the board
 * @param  {number} height height of the board
 * @param  {number} mines mines in the board
 * @param  {string} name name of the gmae in the lobby (multiplayer)
 * 
 **/
Games.prototype.createGame = function(width, height, mines, name,id) {
  var game = new Game(width, height, mines, name,id);
  this.games[game.gameId] = game;
  console.log('game created with id:'+game.gameId);
  return game;
};
// deletes the game from the lobby if all players are disconnected from the game
Games.prototype.removeUnoccupiedGames = function() {
  for (let gameId in this.games) {
    if (!this.games[gameId].hasConnectedPlayers() && !this.games[gameId].doNotDelete){
      delete this.games[gameId];
      console.log('game deleted with id:'+ gameId);
    }
  }
};

Games.prototype.removeGameBygameId = function(gameId) {
  if (this.games[gameId] && !this.games[gameId].hasConnectedPlayers() && !this.games[gameId].doNotDelete){
    delete this.games[gameId];
    console.log('game deleted with id:'+ gameId);
  }
    
};

Games.prototype.getGames = function() {
  return this.games;
};
//returns all games which which are not hidden or share enabled
Games.prototype.getAvailableGames = function() {
  var available = {};
  for (let gameId in this.games) {
    if (!this.games[gameId].hidden)
      available[gameId] = this.games[gameId];
  }
  return available;
};

module.exports = new Games();