'use strict';

const randomcolor = require('randomcolor');
const shortid = require('shortid');
const Board = require('./board');
const uuid = require('uuidv4');
/**
 * dimensions of the board
 * @param  {number} width width of the board
 * @param  {number} height height of the board
 * @param  {number} mines mines in the board
 * @param  {string} name name of the gmae in the lobby (multiplayer)
 * 
 **/
const Game = function(width, height, mines, name, id) {
  if (!width)
    width = 8;
  if (!height)
    height = 8;
  if (!mines)
    mines = 10;
  if (!name)
    name = 'Unnamed game';

  this.name = name;
  //generates unique id to the game
  console.log("id is :"+id);
  this.gameId = (id)?id:shortid.generate();
  //solo -true to play in single player mode
  this.solo=true;
  this.hidden = true;
  this.doNotDelete = false;
  this.resetting = false;
 //changes dimensions of the board in next game {not the current game} 
  this.nextDimensions = {
    width: width,
    height: height,
    mines: mines
  };
  this.board = new Board(width, height, mines);
  this.players = {};
};

Game.prototype.addPlayer = function(username) {
  if (!username)
    username = uuid();

  var player = {
    username: username,
    color: randomcolor(),
    points: (this.players[username]) ? this.players[username].points : 0,
    //connected to know if the player is connected to the game
    connected: true,
    displayName: username
  };
  this.players[username] = player;
  return player;
};

Game.prototype.getPlayer = function(username) {
  return this.players[username];
};

Game.prototype.getPlayers = function() {
  return this.players;
};

Game.prototype.playerDisconnected = function(username) {
  if (this.players[username])
    this.players[username].connected = false;
};
//returns number of players connected to the game
Game.prototype.hasConnectedPlayers = function() {
  for (let username in this.players)
    if (this.players[username].connected)
      return true;
  return false;
};
//clear player points after end of each game
Game.prototype.clearPlayerPoints = function() {
  for (let username in this.players)
    this.players[username].points = 0;
};
// removes disconnected players
Game.prototype.removeDisconnectedPlayers = function() {
  for (let username in this.players)
    if (!this.players[username].connected)
      delete this.players[username];
};

Game.prototype.numberOfConnectedPlayers = function() {
  var count = 0;
  for (let username in this.players)
    if (this.players[username].connected)
      count++;
  return count;
};

Game.prototype.removePlayer = function(username) {
  delete this.players[username];
};

Game.prototype.setNextDimensions = function(dimensions) {
  this.nextDimensions.width = parseInt(dimensions.width);
  this.nextDimensions.height = parseInt(dimensions.height);
  this.nextDimensions.mines = parseInt(dimensions.mines);
};

Game.prototype.getNextDimensions = function() {
  return this.nextDimensions;
};

Game.prototype.getBoard = function() {
  return this.board;
};
/**
 * dimensions of the board
 * @param  {number} x x-cordinate
 * @param  {number} y y-cordinate
 * @param  {string} username username of who clicked the square
 * */
Game.prototype.reveal = function(x, y, username) {
  if (this.resetting)
    return [];

  var revealedSquares = this.board.reveal(x, y, username);

  if (!this.board.lost)
    for (let i in revealedSquares)
      if (revealedSquares[i].revealedBy == username)
        this.players[username].points++;

  return revealedSquares;
};
/**
 * dimensions of the board
 * @param  {number} x x-cordinate of the square
 * @param  {number} y y-cordinate of thesquare
 * removes flag if sqyare is already
 * else flags the square
 * */
Game.prototype.toggleFlag = function(x, y) {
  if (this.resetting)
    return;
  this.board.toggleFlag(x, y);
};

Game.prototype.getWinner = function() {
  var winners = [];
  var highestScore = 0;
  for (let username in this.players) {
    if (this.players[username].points > highestScore) {
      winners = [{
        displayName: this.players[username].displayName,
        points: this.players[username].points
      }];
      highestScore = this.players[username].points;
    } else if (this.players[username].points == highestScore) {
      winners.push({
        displayName: this.players[username].displayName,
        points: this.players[username].points
      });
    }
  }

  return winners;
};

Game.prototype.resetBoard = function() {
  this.board = new Board(this.nextDimensions.width, this.nextDimensions.height, this.nextDimensions.mines);
};

Game.prototype.unhide = function() {
  this.solo = false;
  this.hidden = false;
};
Game.prototype.hide = function() {
  this.hidden = true;
};
Game.prototype.setName = function(name) {
  this.name = name;
};
Game.prototype.updatePlayerDisplayName=function(username,displayName){
  if (this.players[username])
  this.players[username].displayName = displayName;
};

module.exports = Game;