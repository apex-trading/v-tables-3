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
  let dataLength = data.length;

  var data = filterByCustomFilters(
    data,
    this.opts.customFilters,
    this.customQueries
  );

  if (!totalQueries) return data;

  // this checks if the data length has changed after custom filters have been applied and only that custom filter is applied.
  // if (dataLength !== data.length && totalQueries == 1) {
  //   return data;
  // }

  return data.filter(
    function(row, index) {
      found = 0;

      this.filterableColumns.forEach(
        function(column) {
          filterByDate =
            this.opts.dateColumns.indexOf(column) > -1 &&
            this.opts.filterByColumn;
          isListFilter = this.isListFilter(column) && this.opts.filterByColumn;
          dateFormat = this.dateFormat(column);

          value = this._getValue(row, column);

          if (is_valid_moment_object(value) && !filterByDate) {
            value = value.format(dateFormat);
          }

          currentQuery = this.opts.filterByColumn ? query[column] : query;

          currentQuery = setCurrentQuery(currentQuery);

          if (currentQuery) {
          
            // if there is a custom filter in the custom filters array that matches the current column name, return the data. It will have already been filtered.
            const customFilter = this.opts.customFilters.find(filter => filter.name === column);
            if (customFilter && customFilter.name) {
              found++;
            }
            else if (this.opts.filterAlgorithm[column]) {
              if (
                this.opts.filterAlgorithm[column].call(
                  this.$parent.$parent,
                  row,
                  this.opts.filterByColumn ? query[column] : query
                )
              )
                found++;
            } else {
              if (foundMatch(currentQuery, value, isListFilter)) found++;
            }
          }
        }.bind(this)
      );

      return found >= totalQueries;
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
  if (["string", "number", "boolean"].indexOf(typeof value) > -1) {
    value = String(value).toLowerCase();
  }

  // List Filter
  if (isListFilter) {
    return value == query;
  }

  //Text Filter
  if (typeof value === "string") {
    return value.indexOf(query) > -1;
  }

  // Date range

  if (is_valid_moment_object(value)) {
    var start = moment(query.start, "YYYY-MM-DD HH:mm:ss");
    var end = moment(query.end, "YYYY-MM-DD HH:mm:ss");

    return value >= start && value <= end;
  }

  if (typeof value === "object") {
    for (var key in value) {
      if (foundMatch(query, value[key])) return true;
    }

    return false;
  }

  return value >= start && value <= end;
}
