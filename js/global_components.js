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

