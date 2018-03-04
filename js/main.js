/*
    Create an n-demensional array
    @param length whne 2 is a 2d array
    Source: https://stackoverflow.com/a/966938
*/
function createArray(length) {
  let arr = new Array(length || 0),
    i = length;

  if (arguments.length > 1) {
    let args = Array.prototype.slice.call(arguments, 1);
    while (i--) arr[length - 1 - i] = createArray.apply(this, args);
  }

  return arr;
}

/** Only write t0 console when loggable param is true to preevent console log memory issue in browser */
function ilog(message, loggable) {
  if (loggable) {
    console.log(message);
  }
}

/**
 * Define a range-input component to simplify html and encapusulate code where possible
 */
Vue.component("range-input", {
  props: {
    // Validating prop datatypes
    inputId: [String, Number],
    prompt: String,
    promptUnits: String,
    minValue: Number,
    maxValue: Number,
    displayValue: [String, Number],
    initialValue: Number
  },
  template:
    "<div>" +
    '<label for="inputId" class="form-control-label">{{prompt}}: {{displayValue}} {{promptUnits}}</label>' +
    '<input id="inputId" type="range" :min="minValue" :max="maxValue" v-model="value" class="form-control" v-on:change="publishValueChange"/>' +
    "</div>",
  methods: {
    publishValueChange: function() {
      this.$emit("value-change", { value: Number(this.value) });
    }
  },
  data: function() {
    return {
      value: this.initialValue
    };
  }
});

const app = new Vue({
  el: "#app",

  data: {
    board_size: 100, // board size.
    current_state: null,
    next_state: null,
    intervalTimerId: null,
    simulationSpeed: 100, // ms
    initFactor: 3,
    canvas_length: 350, // px
    generation: 0
  },

  created: function() {
    this.initialiseState();
  },

  watch: {
    board_size: function(board_size) {
      this.initialiseState();
      this.drawCurrentState();
    },

    canvas_length: function(board_size) {
      this.initialiseState();
      this.drawCurrentState();
    },

    current_state: function(state) {
      this.drawCurrentState();
    }
  },

  computed: {
    point_width: function() {
      return this.canvas_length / this.board_size;
    },

    sim_is_running: function() {
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
      this.current_state = createArray(this.board_size, this.board_size);
      this.generation = 0;
      // initialise current_state
      for (let i = 0; i < this.current_state.length; i++) {
        for (let j = 0; j < this.current_state[i].length; j++) {
          // if random number less than 0.5, set to 0 else 1
          this.current_state[i][j] =
            Math.random() > this.initialisationDensity ? false : true;
        }
      }
    },

    setStateValue(xpos, ypos, value) {
      let temp_row = this.current_state[xpos];
      temp_row[ypos] = value;
      console.log("(" + xpos + ", " + ypos + ")");
      Vue.set(app.current_state, xpos, temp_row);
      this.drawCurrentState();
    },

    drawCurrentState: function() {
      // getting the canvas and context may be expensive. Try having this as global if it becomes problem
      let canvas = $("#stateCanvas").get(0);
      let ctx = canvas.getContext("2d");

      for (let x = 0; x < this.current_state.length; x++) {
        for (let y = 0; y < this.current_state[x].length; y++) {
          // if random number less than 0.5, set to 0 else 1
          // flip y position when drawing to it looks the right way up on when drawn.
          let yposTranslated = this.current_state[x].length - 1 - y;
          let colour = this.current_state[x][y] ? "red" : "lightgray";
          ctx.beginPath();
          // upper-left-xcoord, upper-left-ycoord, width, height
          ctx.rect(
            this.point_width * x,
            this.point_width * yposTranslated,
            this.point_width,
            this.point_width
          );
          ctx.fillStyle = colour;
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    },

    countNeighbours: function(xpos, ypos, loggable) {
      function getColCount(column_obj, ypos) {
        ilog(
          "getColCount: label= " +
            column_obj.label +
            " ypos= " +
            ypos +
            " ExcludeYpos?= " +
            column_obj.excludeYpos,
          loggable
        );

        let count = 0;

        for (let i = -1; i <= 1; i++) {
          let yCheck = null;
          // On the column, we know the ypos, and we know we need to check ypos -1, +0, and +1 to get the neighbouring cells
          // make sure that modified ypos is inside the column array before setting the check index
          if (ypos + i >= 0 && ypos + i < column_obj.col.length) {
            yCheck = ypos + i;
          }

          // if check index has a value AND we are checking above or below ypos, add to neighbour count
          // OR if check index has value AND we are checking ypos column and we have not been told to skip it (because we are checking cell column), add to neighbour count
          if (
            (i != 0 || (i == 0 && !column_obj.excludeYpos)) &&
            yCheck !== null
          ) {
            count = count + (column_obj.col[yCheck] ? 1 : 0);
          }
        }
        return count;
      }

      ilog("Params: xpos= " + xpos + ", ypos= " + ypos, loggable);

      let neighbours = 0;
      let test_cols = [];
      test_cols.push({
        col: this.current_state[xpos],
        excludeYpos: true,
        label: "center"
      });
      if (xpos < 0 || xpos >= this.current_state.length) {
        ilog(
          "Message: xpos outside of board. ignore for now: " + xpos,
          loggable
        );
      } else if (xpos == this.current_state.length - 1) {
        ilog("Message: Push left", loggable);
        test_cols.push({
          col: this.current_state[xpos - 1],
          excludeYpos: false,
          label: "left"
        });
      } else if (xpos == 0) {
        ilog("Message: Push right", loggable);
        test_cols.push({
          col: this.current_state[xpos + 1],
          excludeYpos: false,
          label: "right"
        });
      } else {
        ilog("Message: Push left and right", loggable);
        test_cols.push({
          col: this.current_state[xpos + 1],
          excludeYpos: false,
          label: "right"
        });
        test_cols.push({
          col: this.current_state[xpos + -1],
          excludeYpos: false,
          label: "left"
        });
      }

      // every column we want to check, count cell neighbours
      for (let i = 0; i < test_cols.length; i++) {
        neighbours = neighbours + getColCount(test_cols[i], ypos);
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
      let return_value = 0;
      // Rules 1-3 (for alive cells)
      if (this.current_state[x][y]) {
        if (neighbours < 2 || neighbours > 3) {
          return_value = false;
        } else {
          return_value = true;
        }
        // Rule 4 (not alive, so dead)
      } else {
        if (neighbours == 3) {
          return_value = true;
        } else {
          return_value = false;
        }
      }

      return return_value;
    },

    // Function which does all the game rule processing.
    // Process current_state applying the outcome of the rules to a temporary state board
    // Then set temporary board as current state
    simulateGeneration: function() {
      // next_state needs to be a new object everytime in order for VueJs to recognise that current_state has changed. It probably requires a new reference.
      this.next_state = createArray(this.board_size, this.board_size);

      for (let x = 0; x < this.current_state.length; x++) {
        for (let y = 0; y < this.current_state[x].length; y++) {
          this.next_state[x][y] = this.applyRulesToCell(x, y);
        }
      }

      this.current_state = this.next_state;
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
