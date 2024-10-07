module.exports = function(data, customFilters, customQueries) {
  var passing;

  return data.filter(function(row) {
    passing = true;

    customFilters.forEach(function(filter) {
      var value = customQueries[filter.name];
      console.log(!filter.callback(row, value));
      if (value && !filter.callback(row, value)) passing = false;
    });

    return passing;
  });
};
