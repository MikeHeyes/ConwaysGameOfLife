/*
    Create an n-demensional array
    @param length whne 2 is a 2d array
    Source: https://stackoverflow.com/a/966938
*/
function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
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

const app = new Vue({
    el: "#app",
    data: {
        length: 50, // board size.
        current_state: null,
        next_state: null,
        intervalTimerId: null,
        simulationSpeed: 200, // ms
        initialisationDensity: 0.3,
    },

    watch: {
        length: function(length) {
            this.initialiseState();
        },

        current_state: function(state) {
            this.drawCurrentState();
        }
    },

    computed: {
        canvas_length: function() {
            return this.length * 6;
        },
        point_width: function() {
            return this.canvas_length / this.length;
        }
        , sim_is_running: function(){return this.intervalTimerId !== null ;}
    },

    created: function() {
        this.initialiseState();
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
            this.current_state = createArray(this.length, this.length);

            // initialise current_state
            for (var i = 0; i < this.current_state.length; i++) {
                for (var j = 0; j < this.current_state[i].length; j++) {
                    // if random number less than 0.5, set to 0 else 1
                    this.current_state[i][j] = Math.random() > this.initialisationDensity ? 0 : 1;
                }
            }
        },

        setStateValue(xpos, ypos, value) {
            var temp_row = this.current_state[xpos];
            temp_row[ypos] = value;
            console.log("(" + xpos + ", " + ypos + ")");
            Vue.set(app.current_state, xpos, temp_row);
            this.drawCurrentState();
        },

        drawCurrentState: function() {
            // getting the canvas and context may be expensive. Try having this as global if it becomes problem
            var canvas = $("#stateCanvas").get(0);
            var ctx = canvas.getContext("2d");

            for (var x = 0; x < this.current_state.length; x++) {
                for (var y = 0; y < this.current_state[x].length; y++) {
                    // if random number less than 0.5, set to 0 else 1
                    // flip y position when drawing to it looks the right way up on when drawn.
                    var yposTranslated = this.current_state[x].length - 1 - y;
                    var colour = this.current_state[x][y] == 0 ? "lightgray" : "red";
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
                var count = 0;
                for (var i = -1; i <= 1; i++) {
                    var yCheck = null;
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
                        count = count + column_obj.col[yCheck];
                    }
                }
                return count;
            }

            ilog("Params: xpos= " + xpos + ", ypos= " + ypos, loggable);

            var neighbours = 0;
            var test_cols = [];
            test_cols.push({
                col: this.current_state[xpos],
                excludeYpos: true,
                label: "center"
            });
            if (xpos < 0 || xpos >= this.current_state.length) {
                ilog("Message: xpos outside of board. ignore for now: " + xpos, loggable);
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
            for (var i = 0; i < test_cols.length; i++) {
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
            var return_value = 0;
            // Rules 1-3 (for alive cells)
            if (this.current_state[x][y] == 1) {
                if (neighbours < 2 || neighbours > 3) {
                    return_value = 0;
                } else {
                    return_value = 1;
                }
                // Rule 4 (not alive, so dead)
            } else {
                if (neighbours == 3) {
                    return_value = 1;
                } else {
                    return_value = 0;
                }
            }

            return return_value;
        },

        // Function which does all the game rule processing.
        // Process current_state applying the outcome of the rules to a temporary state board
        // Then set temporary board as current state
        simulateGeneration: function() {
            // next_state needs to be a new object everytime in order for VueJs to recognise that current_state has changed. It probably requires a new reference.
            this.next_state = createArray(this.length, this.length);

            for (var x = 0; x < this.current_state.length; x++) {
                for (var y = 0; y < this.current_state[x].length; y++) {
                    this.next_state[x][y] = this.applyRulesToCell(x, y);
                }
            }

            this.current_state = this.next_state;
        }
    }
});

// this doesnt actually draw when called from the created vue instance hook. maybe because the canvas is still updating ?
app.drawCurrentState();
