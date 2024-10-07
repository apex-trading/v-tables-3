import { object_filled_keys_count } from "../helpers/object-filled-keys-count";
import { is_valid_moment_object } from "../helpers/is-valid-moment-object";
import filterByCustomFilters from "../filters/custom-filters";

export default function(data, e) {
  if (e) {
    let query = this.query || {};

    // Handle input event and query update
    this.setPage(1, true);

    const name = this.getName(e.target.name);
    const value =
      typeof e.target.value === "object"
        ? e.target.value
        : String(e.target.value || "");

    // Update query based on the input field
    if (name) {
      query[name] = value;
    } else {
      query = value;
    }

    // Vuex or local state management (reactive handling)
    if (this.vuex) {
      this.commit("SET_FILTER", query);
    } else {
      this.query = query;
    }

    this.updateState("query", query);

    // Dispatching filter event (emit or custom event handling)
    if (name) {
      this.dispatch("filter", { name, value });
      this.dispatch(`filter::${name}`, value);
    } else {
      this.dispatch("filter", value);
    }
  }

  let query = this.query || {};
  let totalQueries = this.opts.filterByColumn
    ? object_filled_keys_count(query)
    : 1;

  if (!this.opts) return data;

  // Apply custom filters (external filters applied before default filters)
  data = filterByCustomFilters(
    data,
    this.opts.customFilters,
    this.customQueries
  );

  // If no valid queries, return original data set
  if (!totalQueries) return data;

  // Filter the data rows based on the column query filters
  return data.filter((row) => {
    let found = 0;

    this.filterableColumns.forEach((column) => {
      let value = this._getValue(row, column); // Get the value of the current column in the row
      const filterByDate =
        this.opts.dateColumns.includes(column) && this.opts.filterByColumn;
      const isListFilter =
        this.isListFilter(column) && this.opts.filterByColumn;
      const dateFormat = this.dateFormat(column);

      // Handle date formatting if the column contains moment objects
      if (is_valid_moment_object(value) && !filterByDate) {
        value = value.format(dateFormat);
      }

      let currentQuery = this.opts.filterByColumn ? query[column] : query;
      currentQuery = setCurrentQuery(currentQuery);

      // Check for a match if a valid query exists
      if (currentQuery) {
        if (this.opts.filterAlgorithm && this.opts.filterAlgorithm[column]) {
          // Use custom filter algorithm if specified
          if (
            this.opts.filterAlgorithm[column].call(
              this.$parent,
              row,
              currentQuery
            )
          ) {
            found++;
          }
        } else {
          // Default matching logic
          if (foundMatch(currentQuery, value, isListFilter)) {
            found++;
          }
        }
      }
    });

    // Return true if the number of matched queries equals or exceeds the total queries
    return found >= totalQueries;
  });
}

// Helper function to standardize the query for matching
function setCurrentQuery(query) {
  if (!query) return "";
  if (typeof query === "string") return query.toLowerCase(); // Convert string queries to lowercase
  return query; // Return query as is (for object/array queries)
}

// Match the query to the row's value, considering list filters and text matching
function foundMatch(query, value, isListFilter) {
  if (["string", "number", "boolean"].includes(typeof value)) {
    value = String(value).toLowerCase(); // Convert value to string and lowercase for comparison
  }

  // Handle list filters (exact match required)
  if (isListFilter) {
    return value == query;
  }

  // Handle text filters (contains matching)
  if (typeof value === "string") {
    return value.includes(query);
  }

  // Handle date range filters
  if (
    is_valid_moment_object(value) &&
    typeof query === "object" &&
    query.start &&
    query.end
  ) {
    const start = moment(query.start, "YYYY-MM-DD HH:mm:ss");
    const end = moment(query.end, "YYYY-MM-DD HH:mm:ss");
    return value.isBetween(start, end, null, "[]"); // Inclusive date range comparison
  }

  // Handle object comparisons (recursive check for nested properties)
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value).some((key) =>
      foundMatch(query, value[key], isListFilter)
    );
  }

  return false; // Return false if no match found
}
