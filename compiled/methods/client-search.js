"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;

var _objectFilledKeysCount = require("../helpers/object-filled-keys-count");

var _isValidMomentObject = require("../helpers/is-valid-moment-object");

var _customFilters = _interopRequireDefault(require("../filters/custom-filters"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _default(data, e) {
  var _this = this;

  if (e) {
    var _query = this.query || {}; // Handle input event and query update


    this.setPage(1, true);
    var name = this.getName(e.target.name);
    var value = _typeof(e.target.value) === "object" ? e.target.value : String(e.target.value || ""); // Update query based on the input field

    if (name) {
      _query[name] = value;
    } else {
      _query = value;
    } // Vuex or local state management (reactive handling)


    if (this.vuex) {
      this.commit("SET_FILTER", _query);
    } else {
      this.query = _query;
    }

    this.updateState("query", _query); // Dispatching filter event (emit or custom event handling)

    if (name) {
      this.dispatch("filter", {
        name: name,
        value: value
      });
      this.dispatch("filter::".concat(name), value);
    } else {
      this.dispatch("filter", value);
    }
  }

  var query = this.query || {};
  var totalQueries = this.opts.filterByColumn ? (0, _objectFilledKeysCount.object_filled_keys_count)(query) : 1;
  if (!this.opts) return data; // Apply custom filters (external filters applied before default filters)

  data = (0, _customFilters["default"])(data, this.opts.customFilters, this.customQueries); // If no valid queries, return original data set

  if (!totalQueries) return data; // Filter the data rows based on the column query filters

  return data.filter(function (row) {
    var found = 0;

    _this.filterableColumns.forEach(function (column) {
      var value = _this._getValue(row, column); // Get the value of the current column in the row


      var filterByDate = _this.opts.dateColumns.includes(column) && _this.opts.filterByColumn;

      var isListFilter = _this.isListFilter(column) && _this.opts.filterByColumn;

      var dateFormat = _this.dateFormat(column); // Handle date formatting if the column contains moment objects


      if ((0, _isValidMomentObject.is_valid_moment_object)(value) && !filterByDate) {
        value = value.format(dateFormat);
      }

      var currentQuery = _this.opts.filterByColumn ? query[column] : query;
      currentQuery = setCurrentQuery(currentQuery); // Check for a match if a valid query exists

      if (currentQuery) {
        if (_this.opts.filterAlgorithm && _this.opts.filterAlgorithm[column]) {
          // Use custom filter algorithm if specified
          if (_this.opts.filterAlgorithm[column].call(_this.$parent, row, currentQuery)) {
            found++;
          }
        } else {
          // Default matching logic
          if (foundMatch(currentQuery, value, isListFilter)) {
            found++;
          }
        }
      }
    }); // Return true if the number of matched queries equals or exceeds the total queries


    return found >= totalQueries;
  });
} // Helper function to standardize the query for matching


function setCurrentQuery(query) {
  if (!query) return "";
  if (typeof query === "string") return query.toLowerCase(); // Convert string queries to lowercase

  return query; // Return query as is (for object/array queries)
} // Match the query to the row's value, considering list filters and text matching


function foundMatch(query, value, isListFilter) {
  if (["string", "number", "boolean"].includes(_typeof(value))) {
    value = String(value).toLowerCase(); // Convert value to string and lowercase for comparison
  } // Handle list filters (exact match required)


  if (isListFilter) {
    return value == query;
  } // Handle text filters (contains matching)


  if (typeof value === "string") {
    return value.includes(query);
  } // Handle date range filters


  if ((0, _isValidMomentObject.is_valid_moment_object)(value) && _typeof(query) === "object" && query.start && query.end) {
    var start = moment(query.start, "YYYY-MM-DD HH:mm:ss");
    var end = moment(query.end, "YYYY-MM-DD HH:mm:ss");
    return value.isBetween(start, end, null, "[]"); // Inclusive date range comparison
  } // Handle object comparisons (recursive check for nested properties)


  if (_typeof(value) === "object" && !Array.isArray(value)) {
    return Object.keys(value).some(function (key) {
      return foundMatch(query, value[key], isListFilter);
    });
  }

  return false; // Return false if no match found
}