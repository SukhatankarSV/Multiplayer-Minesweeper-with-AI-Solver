'use strict';
const leaderBoard = function (){
    this.scores = [];
};

leaderBoard.prototype.getScores = function(){
        return this.scores;
};

leaderBoard.prototype.addScoreToPlayer = function(winners, time){
    winners.forEach(winner => {
        this.scores.push([winner.displayName,{
            points: winner.points,
            time: time
        }]);
    });
    this.sort();
    this.scores = this.scores.slice(0,2);
};

leaderBoard.prototype.sort = function(){
    this.scores.sort(function(a, b) {
        if(a[1].points == b[1].points)
            return a[1].time > b[1].time;
        else return a[1].points < b[1].points; 
    });
    console.log(JSON.stringify(this.scores, null, 4));
}
module.exports = new leaderBoard();