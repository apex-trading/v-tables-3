var object_filled_keys_count = require("../helpers/object-filled-keys-count");
var is_valid_moment_object = require("../helpers/is-valid-moment-object");
var filterByCustomFilters = require("../filters/custom-filters");

module.exports = function(data, e) {
  if (e) {
    let query = this.query;

    this.setPage(1, true);

    var name = this.getName(e.target.name);
    var value =
      typeof e.target.value === "object" ? e.target.value : "" + e.target.value;

    if (name) {
      query[name] = value;
    } else {
      query = value;
    }

    this.vuex ? this.commit("SET_FILTER", query) : (this.query = query);

    this.updateState("query", query);

    if (name) {
      this.dispatch("filter", { name, value });
      this.dispatch(`filter::${name}`, value);
    } else {
      this.dispatch("filter", value);
    }
  }

  var query = this.query;

  var totalQueries = !query ? 0 : 1;

  if (!this.opts) return data;

  if (this.opts.filterByColumn) {
    totalQueries = object_filled_keys_count(query);
  }

  var value;
  var found;
  var currentQuery;
  var dateFormat;
  var filterByDate;
  var isListFilter;

  console.log("data before", data.length);
  console.log("customFilters", this.opts.customFilters);
  console.log("customQueries", this.customQueries);

  var data = filterByCustomFilters(
    data,
    this.opts.customFilters,
    this.customQueries
  );

  console.log("data after", data.length);
  console.log("totalQueries", totalQueries);

  if (!totalQueries) return data;

  this.filterableColumns.forEach(
    function(column) {
      console.log("Filtering by column:", column);
      filterByDate =
        this.opts.dateColumns.indexOf(column) > -1 && this.opts.filterByColumn;
      isListFilter = this.isListFilter(column) && this.opts.filterByColumn;
      dateFormat = this.dateFormat(column);

      value = this._getValue(row, column);
      console.log("Value for column", column, ":", value);

      if (is_valid_moment_object(value) && !filterByDate) {
        value = value.format(dateFormat);
      }

      currentQuery = this.opts.filterByColumn ? query[column] : query;

      currentQuery = setCurrentQuery(currentQuery);

      console.log("Current query for column", column, ":", currentQuery);

      if (currentQuery) {
        if (this.opts.filterAlgorithm[column]) {
          if (
            this.opts.filterAlgorithm[column].call(
              this.$parent.$parent,
              row,
              this.opts.filterByColumn ? query[column] : query
            )
          )
            found++;
        } else {
          if (foundMatch(currentQuery, value, isListFilter)) {
            found++;
            console.log("Found match in column:", column);
          }
        }
      }
    }.bind(this)
  );
};

function setCurrentQuery(query) {
  if (!query) return "";

  if (typeof query == "string") return query.toLowerCase();

  // Date Range

  return query;
}

function foundMatch(query, value, isListFilter) {
  console.log("Matching query:", query, "with value:", value);

  if (["string", "number", "boolean"].indexOf(typeof value) > -1) {
    value = String(value).toLowerCase();
  }

  // List Filter
  if (isListFilter) {
    console.log("Using list filter, comparing:", value, "with", query);
    return value == query;
  }

  // Text Filter
  if (typeof value === "string") {
    return value.indexOf(query) > -1;
  }

  // Date range filter
  if (is_valid_moment_object(value)) {
    var start = moment(query.start, "YYYY-MM-DD HH:mm:ss");
    var end = moment(query.end, "YYYY-MM-DD HH:mm:ss");
    console.log("Date range:", start, "-", end, "for value:", value);

    return value >= start && value <= end;
  }

  // Check objects for nested properties
  if (typeof value === "object") {
    for (var key in value) {
      if (foundMatch(query, value[key])) return true;
    }

    return false;
  }

  return false;
}
