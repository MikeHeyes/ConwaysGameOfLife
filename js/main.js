const app = new Vue({
  el: "#app",
  data: {
    boardSize: 80, // board size.
    currentState: null,
    nextState: null,
    intervalTimerId: null,
    simulationSpeed: 100, // ms
    initFactor: 3,
    canvasLength: 350, // px
    generation: 0,
    wrapBoard: true
  },

  created: function() {
    this.initialiseState();
  },

  watch: {
    boardSize: function(boardSize) {
      this.initialiseState();
      this.drawCurrentState();
    },

    canvasLength: function(boardSize) {
      this.initialiseState();
      this.drawCurrentState();
    },

    currentState: function(state) {
      this.drawCurrentState();
    }
  },

  computed: {
    pointWidth: function() {
      return this.canvasLength / this.boardSize;
    },

    simIsRunning: function() {
      return this.intervalTimerId !== null;
    },

    initialisationDensity: function() {
      return this.initFactor / 10;
    }
  },

  methods: {
    startSimulation: function() {
      this.intervalTimerId = setInterval(
        this.simulateGeneration,
        this.simulationSpeed
      );
    },

    stopSimulation: function() {
      if (this.intervalTimerId !== null) {
        clearInterval(this.intervalTimerId);
        this.intervalTimerId = null;
      }
    },

    initialiseState: function() {
      this.stopSimulation();
      this.currentState = createArray(this.boardSize, this.boardSize);
      this.generation = 0;
      // initialise currentState
      for (let i = 0; i < this.currentState.length; i++) {
        for (let j = 0; j < this.currentState[i].length; j++) {
          // if random number less than 0.5, set to 0 else 1
          this.currentState[i][j] =
            Math.random() > this.initialisationDensity ? false : true;
        }
      }
    },

    setStateValue(xpos, ypos, value) {
      let temp_row = this.currentState[xpos];
      temp_row[ypos] = value;
      console.log("(" + xpos + ", " + ypos + ")");
      Vue.set(app.currentState, xpos, temp_row);
      this.drawCurrentState();
    },

    drawCurrentState: function() {
      // getting the canvas and context may be expensive. Try having this as global if it becomes problem
      let canvas = $("#stateCanvas").get(0);
      let ctx = canvas.getContext("2d");

      for (let x = 0; x < this.currentState.length; x++) {
        for (let y = 0; y < this.currentState[x].length; y++) {
          // if random number less than 0.5, set to 0 else 1
          // flip y position when drawing to it looks the right way up on when drawn.
          let yposTranslated = this.currentState[x].length - 1 - y;
          let colour = this.currentState[x][y] ? "red" : "lightgray";
          ctx.beginPath();
          // upper-left-xcoord, upper-left-ycoord, width, height
          ctx.rect(
            this.pointWidth * x,
            this.pointWidth * yposTranslated,
            this.pointWidth,
            this.pointWidth
          );
          ctx.fillStyle = colour;
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    },

    getColCount: function(column_obj, loggable) {
      ilog(
        "getColCount: label= " +
          column_obj.label +
          " ypos= " +
          column_obj.ypos +
          " ExcludeYpos?= " +
          column_obj.excludeYpos,
        loggable
      );

      let count = 0;

      for (let i = -1; i <= 1; i++) {
        let yCheck = null;
        // On the column, we know the ypos, and we know we need to check ypos -1, +0, and +1 to get the neighbouring cells
        // make sure that modified ypos is inside the column array before setting the check index
        if (
          (!this.wrapBoard &&
            column_obj.ypos + i >= 0 &&
            column_obj.ypos + i < column_obj.col.length) ||
          this.wrapBoard
        ) {
          yCheck =
            (column_obj.ypos + i + column_obj.col.length) %
            column_obj.col.length;
        }

        // if check index has a value AND we are checking above or below ypos, add to neighbour count
        // OR if check index has value AND we are checking ypos column and we have not been told to skip it (because we are checking cell column), add to neighbour count
        if (i != 0 || (i == 0 && !column_obj.excludeYpos)) {
          count = count + (column_obj.col[yCheck] ? 1 : 0);
        }
      }
      return count;
    },

    countNeighbours: function(xpos, ypos, loggable) {
      ilog("Params: xpos= " + xpos + ", ypos= " + ypos, loggable);

      let neighbours = 0;
      let testCols = [];
      testCols.push({
        col: this.currentState[xpos],
        ypos: ypos,
        excludeYpos: true,
        label: "center"
      });
      if ((!this.wrapBoard && xpos - 1 >= 0) || this.wrapBoard) {
        testCols.push({
          col: this.currentState[
            (xpos - 1 + this.currentState.length) % this.currentState.length
          ],
          excludeYpos: false,
          ypos: ypos,
          label: "left"
        });
      }
      if (
        (!this.wrapBoard && xpos + 1 < this.currentState.length) ||
        this.wrapBoard
      ) {
        testCols.push({
          col: this.currentState[
            (xpos + 1 + this.currentState.length) % this.currentState.length
          ],
          excludeYpos: false,
          ypos: ypos,
          label: "right"
        });
      }

      // every column we want to check, count cell neighbours
      for (let i = 0; i < testCols.length; i++) {
        neighbours = neighbours + this.getColCount(testCols[i]);
      }

      return neighbours;
    },

    /**
     * Does not affect state but get outcome of rules if they were applied to the cell now
     * return [0,1]
     */
    applyRulesToCell: function(x, y) {
      // Rules:
      //  1.  Any live cell with fewer than two live neighbours dies, as if caused by underpopulation.
      //  2.  Any live cell with two or three live neighbours lives on to the next generation.
      //  3.  Any live cell with more than three live neighbours dies, as if by overpopulation.
      //  4.  Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.

      neighbours = this.countNeighbours(x, y);
      let returnValue = 0;
      // Rules 1-3 (for alive cells)
      if (this.currentState[x][y]) {
        if (neighbours < 2 || neighbours > 3) {
          returnValue = false;
        } else {
          returnValue = true;
        }
        // Rule 4 (not alive, so dead)
      } else {
        if (neighbours == 3) {
          returnValue = true;
        } else {
          returnValue = false;
        }
      }

      return returnValue;
    },

    // Function which does all the game rule processing.
    // Process currentState applying the outcome of the rules to a temporary state board
    // Then set temporary board as current state
    simulateGeneration: function() {
      // nextState needs to be a new object everytime in order for VueJs to recognise that currentState has changed. It probably requires a new reference.
      this.nextState = createArray(this.boardSize, this.boardSize);

      for (let x = 0; x < this.currentState.length; x++) {
        for (let y = 0; y < this.currentState[x].length; y++) {
          this.nextState[x][y] = this.applyRulesToCell(x, y);
        }
      }

      this.currentState = this.nextState;
      this.generation = this.generation + 1;
    },

    /**
     * Functions which register updates to components and then apply to appropraite data attributes
     */
    updateIntialisationDensity: function(payload) {
      this.initFactor = payload.value;
      this.initialiseState();
    },
    updateSimulationSpeed: function(payload) {
      this.simulationSpeed = payload.value;
    }
  }
});

// this doesnt actually draw when called from the created vue instance hook. maybe because the canvas is still updating ?
app.drawCurrentState();
