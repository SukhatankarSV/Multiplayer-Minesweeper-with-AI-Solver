function forEachCell(matrix, func) {
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      func(matrix[i][j], i, j);
    }
  }
}

function runOnAllAdjacentBlocks(row, col, dimension, func) {
  if (row != 0 && col != 0) {
    func(row - 1, col - 1);
  }
  if (row != 0) {
    func(row - 1, col);
  }
  if (col != 0) {
    func(row, col - 1);
  }
  if (row != dimension.height - 1 && col != dimension.width - 1) {
    func(row + 1, col + 1);
  }
  if (row != dimension.height - 1) {
    func(row + 1, col);
  }
  if (col != dimension.width - 1) {
    func(row, col + 1);
  }
  if (row != 0 && col != dimension.width - 1) {
    func(row - 1, col + 1);
  }
  if (row != dimension.height - 1 && col != 0) {
    func(row + 1, col - 1);
  }
}



class Solver {
  constructor(board) {
    this.minesweeper = board;
  
  }

  getNextMove() {
    const cellToFlag = this.findCellToFlag();
    if (cellToFlag) {
      return {
          status: 'flag',
          x: cellToFlag[0],
          y: cellToFlag[1]
      };
    }

    const cellToClick = this.findCellToClick();
    if (cellToClick) {
      return {
          status: 'click',
          x: cellToClick[0],
          y: cellToClick[1]
      };
    }

    const dimen = this.minesweeper.getDimensions();
    var limit_for_loop = 5;
    while(true){
      const row = Math.floor(Math.random() * (dimen.height - 1));
      const col = Math.floor(Math.random() * (dimen.width - 1));
      if((this.minesweeper.squares[row][col].revealed || this.minesweeper.squares[row][col].flagged) && limit_for_loop-->0)
        continue;
      return {
        status: 'click',
        x: row,
        y: col
      };

    }
  }

    
  findCellToFlag() {
    const dimen = this.minesweeper.getDimensions();

    let rowToFlag = undefined;
    let colToFlag = undefined;
    forEachCell(this.minesweeper.squares, (cell, row, col) => {
      if (cell.revealed || cell.flagged || (rowToFlag !== undefined)) {
        return;
      }

      runOnAllAdjacentBlocks(row, col, dimen, (neighborRow, neighborCol) => {
        const neighbor = this.minesweeper.squares[neighborRow][neighborCol];
        if (neighbor.revealed && neighbor.count > 0) {
          let numUnrevealedAroundNeighbor = 0;
          runOnAllAdjacentBlocks(neighborRow, neighborCol, dimen, (i, j) => {
            const neighborOfNeighbor = this.minesweeper.squares[i][j];
            if (!neighborOfNeighbor.revealed) {
              numUnrevealedAroundNeighbor++;
            }
          });

          if (numUnrevealedAroundNeighbor === neighbor.count) {
            rowToFlag = row;
            colToFlag = col;
          }
        }
      });
    });

    if (rowToFlag !== undefined) {
      return [rowToFlag, colToFlag];
    }
    return undefined;
  }

  
  findCellToClick() {
    const dimen = this.minesweeper.getDimensions();

    let rowToClick = undefined;
    let colToClick = undefined;
    forEachCell(this.minesweeper.squares, (cell, row, col) => {
      if (cell.revealed || cell.flagged || (rowToClick !== undefined)) {
        return;
      }

      runOnAllAdjacentBlocks(row, col, dimen, (neighborRow, neighborCol) => {
        const neighbor = this.minesweeper.squares[neighborRow][neighborCol];
        if (neighbor.revealed) {
          let numFlagged = 0;
          runOnAllAdjacentBlocks(neighborRow, neighborCol, dimen, (i, j) => {
            const neighborOfNeighbor = this.minesweeper.squares[i][j];
            if (!neighborOfNeighbor.revealed && neighborOfNeighbor.flagged) {
              numFlagged++;
            }
          });

          if (numFlagged === neighbor.count) {
            rowToClick = row;
            colToClick = col;
          }
        }
      });
    });

    if (rowToClick !== undefined) {
      return [rowToClick, colToClick];
    }
    return undefined;
  }
}

module.exports= Solver;